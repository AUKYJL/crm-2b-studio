import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Enums } from "@/shared/api/database.types";
import { supabase } from "@/shared/api/supabase";

import { USER_ROLE, type UserRole } from "@/features/auth/auth-store";
import { objectsKey } from "@/features/objects/objects-api";

export type TaskListItem = {
  id: string;
  title: string;
  status: Enums<"task_status">;
  assignee: { full_name: string } | null;
  created_at: string;
};

const pageSize = 500;
export const objectTasksKey = (objectId: string) => ["object-tasks", objectId];

export function useObjectTasks(
  objectId: string,
  userId: string,
  role: UserRole,
) {
  return useQuery({
    queryKey: [...objectTasksKey(objectId), userId, role],
    gcTime: 0,
    queryFn: async ({ signal }) => {
      const tasks: TaskListItem[] = [];

      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabase
          .from("tasks")
          .select(
            "id, title, status, assignee:profiles!tasks_assignee_id_fkey(full_name), created_at",
          )
          .eq("object_id", objectId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .order("id")
          .range(offset, offset + pageSize - 1)
          .abortSignal(signal);

        if (error) throw error;
        tasks.push(...data);
        if (data.length < pageSize) return tasks;
      }
    },
    retry: false,
  });
}

export function useExecutors(userId: string) {
  return useQuery({
    queryKey: ["executors", userId],
    queryFn: async ({ signal }) => {
      const executors: { id: string; full_name: string }[] = [];

      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", USER_ROLE.EXECUTOR)
          .order("full_name")
          .order("id")
          .range(offset, offset + pageSize - 1)
          .abortSignal(signal);

        if (error) throw error;
        executors.push(...data);
        if (data.length < pageSize) return executors;
      }
    },
    retry: false,
  });
}

export function useCreateTask(objectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fields: {
      title: string;
      description: string;
      assigneeId: string;
    }) => {
      const { error } = await supabase.rpc("create_task", {
        p_object_id: objectId,
        p_title: fields.title,
        p_description: fields.description,
        p_assignee_id: fields.assigneeId,
      });

      if (error) throw error;
    },
    networkMode: "always",
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: objectTasksKey(objectId) }),
        queryClient.invalidateQueries({ queryKey: objectsKey }),
      ]),
  });
}
