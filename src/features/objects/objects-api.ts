import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Database } from "@/shared/api/database.types";
import { supabase } from "@/shared/api/supabase";

import type { UserRole } from "@/features/auth/auth-store";

type ObjectRow = Database["public"]["Tables"]["objects"]["Row"];

export type ObjectFields = Pick<ObjectRow, "name" | "address">;
export type ObjectListItem = ObjectFields &
  Pick<ObjectRow, "id" | "updated_at"> & { taskCount: number };

export const objectsKey = ["objects"] as const;
const pageSize = 500;

async function listObjects(signal: AbortSignal) {
  const objects: ObjectListItem[] = [];

  for (let offset = 0; ; offset += pageSize) {
    // The embedded count uses the same user's RLS policies as a direct tasks read.
    const { data, error } = await supabase
      .from("objects")
      .select("id, name, address, updated_at, tasks(count)")
      .is("deleted_at", null)
      .is("tasks.deleted_at", null)
      .order("updated_at", { ascending: false })
      .order("id")
      .range(offset, offset + pageSize - 1)
      .abortSignal(signal);

    if (error) throw error;

    for (const { tasks, ...object } of data) {
      objects.push({ ...object, taskCount: tasks[0]?.count ?? 0 });
    }

    if (data.length < pageSize) return objects;
  }
}

export function useObjects(userId: string, role: UserRole, enabled = true) {
  return useQuery({
    queryKey: [...objectsKey, userId, role],
    queryFn: ({ signal }) => listObjects(signal),
    enabled,
    retry: false,
  });
}

export function useObject(id: string, userId: string, role: UserRole) {
  return useQuery({
    queryKey: [...objectsKey, "detail", userId, role, id],
    gcTime: 0,
    queryFn: async ({ signal }) => {
      if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
        return null;
      }

      const { data, error } = await supabase
        .from("objects")
        .select("id, name, address")
        .eq("id", id)
        .is("deleted_at", null)
        .abortSignal(signal)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    retry: false,
  });
}

type ObjectChange =
  | { type: "create"; fields: ObjectFields }
  | { type: "update"; id: string; fields: ObjectFields }
  | { type: "archive"; id: string };

async function changeObject(change: ObjectChange) {
  if (change.type === "archive") {
    const { error } = await supabase.rpc("archive_object", {
      p_object_id: change.id,
    });
    if (error) throw error;
    return;
  }

  const fields = {
    p_name: change.fields.name,
    p_address: change.fields.address,
  };
  const { error } =
    change.type === "create"
      ? await supabase.rpc("create_object", fields)
      : await supabase.rpc("update_object", {
          ...fields,
          p_object_id: change.id,
        });

  if (error) throw error;
}

export function useObjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: changeObject,
    networkMode: "always",
    onSuccess: () => queryClient.invalidateQueries({ queryKey: objectsKey }),
  });
}

export function objectMutationError(error: unknown, fallback: string) {
  if (typeof error === "object" && error && "code" in error) {
    if (error.code === "42501") return "У вас нет прав на это действие.";
    if (error.code === "PT404")
      return "Объект уже недоступен. Обновите список.";
  }

  return fallback;
}
