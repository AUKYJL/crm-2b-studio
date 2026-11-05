import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Enums } from "@/shared/api/database.types";
import { supabase } from "@/shared/api/supabase";

import { executorsKey, myTasksKey, objectTasksKeys } from "./tasks-api";
import type { UserRole } from "@/features/auth/auth-store";
import { objectsKey } from "@/features/objects/objects-api";

const taskKey = (id: string) => ["task", id];
const historyKey = (id: string) => ["task-events", id];
const pageSize = 500;

async function getNames(ids: string[], signal: AbortSignal) {
  const names = new Map<string, string>();
  const unique = [...new Set(ids)];

  // Keep the PostgREST filter small even for a long task history.
  for (let offset = 0; offset < unique.length; offset += 50) {
    const { data, error } = await supabase
      .from("profile_names")
      .select("id, full_name")
      .in("id", unique.slice(offset, offset + 50))
      .abortSignal(signal);

    if (error) throw error;
    for (const { id, full_name } of data) {
      if (id && full_name) names.set(id, full_name);
    }
  }

  return names;
}

async function getTask(id: string, signal: AbortSignal) {
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }

  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, title, description, status, assignee_id, author_id, created_at, object:objects!inner(id, name)",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .abortSignal(signal)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const names = await getNames([data.assignee_id, data.author_id], signal);
  return {
    ...data,
    assigneeName: names.get(data.assignee_id),
    authorName: names.get(data.author_id),
  };
}

export type TaskDetail = NonNullable<Awaited<ReturnType<typeof getTask>>>;

export function useTask(id: string, userId: string, role: UserRole) {
  return useQuery({
    queryKey: [...taskKey(id), userId, role],
    queryFn: ({ signal }) => getTask(id, signal),
    gcTime: 0,
    retry: false,
  });
}

export function useTaskHistory(id: string, userId: string, role: UserRole) {
  return useQuery({
    queryKey: [...historyKey(id), userId, role],
    gcTime: 0,
    retry: false,
    queryFn: async ({ signal }) => {
      const events = [];
      const participantIds = [];

      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabase
          .from("task_events")
          .select(
            "id, type, actor_id, created_at, from_status, to_status, old_assignee_id, new_assignee_id, comment, tasks!inner(id)",
          )
          .eq("task_id", id)
          .order("created_at", { ascending: false })
          .order("id")
          .range(offset, offset + pageSize - 1)
          .abortSignal(signal);

        if (error) throw error;
        events.push(...data);
        for (const event of data) {
          participantIds.push(event.actor_id);
          if (event.old_assignee_id) participantIds.push(event.old_assignee_id);
          if (event.new_assignee_id) participantIds.push(event.new_assignee_id);
        }
        if (data.length < pageSize) break;
      }

      return { events, names: await getNames(participantIds, signal) };
    },
  });
}

type TaskStatus = Enums<"task_status">;

export type TaskChange =
  | { type: "transition"; from: TaskStatus; to: TaskStatus; comment?: string }
  | { type: "reassign"; from: string; to: string }
  | { type: "edit"; title: string; description: string; objectId: string }
  | { type: "archive" };

async function changeTask(id: string, change: TaskChange) {
  const p_task_id = id;
  switch (change.type) {
    case "transition":
      return supabase.rpc("transition_task", {
        p_task_id,
        p_expected_status: change.from,
        p_to_status: change.to,
        p_comment: change.comment,
      });
    case "reassign":
      return supabase.rpc("reassign_task", {
        p_task_id,
        p_expected_assignee_id: change.from,
        p_assignee_id: change.to,
      });
    case "edit":
      return supabase.rpc("update_task", {
        p_task_id,
        p_object_id: change.objectId,
        p_title: change.title,
        p_description: change.description,
      });
    case "archive":
      return supabase.rpc("archive_task", { p_task_id });
  }
}

export function useTaskMutation(id: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (change: TaskChange) => {
      const { error } = await changeTask(id, change);
      if (error) throw error;
    },
    networkMode: "always",
    onSettled: (_data, error, change) =>
      Promise.all([
        client.invalidateQueries({ queryKey: taskKey(id) }),
        client.invalidateQueries({ queryKey: historyKey(id) }),
        client.invalidateQueries({ queryKey: objectTasksKeys }),
        client.invalidateQueries({ queryKey: objectsKey }),
        client.invalidateQueries({ queryKey: myTasksKey }),
        ...(error && change.type === "reassign"
          ? [client.invalidateQueries({ queryKey: executorsKey })]
          : []),
      ]),
  });
}

export function taskMutationError(error: Error) {
  const code = "code" in error ? error.code : undefined;
  switch (code) {
    case "PT409":
    case "40001":
    case "40P01":
      return "Задача изменилась. Проверьте текущее состояние и повторите действие.";
    case "PT404":
      return "Задача или выбранный объект больше недоступны.";
    case "42501":
      return "У вас нет прав на это действие.";
    case "22023":
      return "Действие больше недоступно. Проверьте статус и исполнителя задачи.";
    default:
      return "Не удалось сохранить изменения. Повторите попытку.";
  }
}
