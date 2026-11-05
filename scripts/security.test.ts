import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseEnv } from "node:util";

import type { Database } from "../src/shared/api/database.types.ts";

type Client = ReturnType<typeof createClient<Database>>;
type Status = Database["public"]["Enums"]["task_status"];
type Event = Database["public"]["Tables"]["task_events"]["Row"];
type Result = { error: { code?: string } | null };

function data<T>(
  result: { data: T; error: null } | { error: { code?: string } },
  label: string,
) {
  if (result.error)
    throw new Error(`${label}: ${result.error.code ?? "ошибка API"}`);
  assert(result.data !== null, label);
  return result.data;
}

function denied(result: Result, code: string, label: string) {
  assert.equal(result.error?.code, code, label);
}

async function unchanged<T>(
  label: string,
  code: string,
  read: () => Promise<T>,
  write: () => PromiseLike<Result>,
) {
  const before = await read();
  const result = await write();
  assert.deepEqual(await read(), before, `${label}: данные изменились`);
  denied(result, code, label);
}

function transition(
  client: Client,
  id: string,
  from: Status,
  to: Status,
  comment: string | null = null,
) {
  return client.rpc("transition_task", {
    p_task_id: id,
    p_expected_status: from,
    p_to_status: to,
    ...(comment === null ? {} : { p_comment: comment }),
  });
}

async function taskState(client: Client, id: string) {
  const [tasks, events] = await Promise.all([
    client.from("tasks").select().eq("id", id),
    client.from("task_events").select().eq("task_id", id).order("id"),
  ]);
  return {
    tasks: data(tasks, "Чтение задачи"),
    events: data(events, "Чтение истории"),
  };
}

function assertEvent(
  before: Awaited<ReturnType<typeof taskState>>,
  after: Awaited<ReturnType<typeof taskState>>,
  taskChanges: Partial<(typeof before.tasks)[number]>,
  expected: Omit<Event, "id" | "task_id" | "created_at">,
) {
  assert.equal(before.tasks.length, 1);
  assert.equal(after.tasks.length, 1);
  const previous = before.tasks[0];
  const current = after.tasks[0];
  assert(
    Number.isFinite(Date.parse(current.updated_at)),
    "Некорректное время задачи",
  );
  assert(
    current.updated_at > previous.updated_at,
    "Время обновления не продвинулось",
  );
  assert.deepEqual(current, {
    ...previous,
    ...taskChanges,
    updated_at: current.updated_at,
  });

  const newEvents = after.events.filter(
    ({ id }) => !before.events.some((event) => event.id === id),
  );
  assert.equal(newEvents.length, 1, "Ожидалось ровно одно новое событие");
  const [event] = newEvents;
  assert.deepEqual(
    after.events.filter(({ id }) => id !== event.id),
    before.events,
  );
  assert.deepEqual(event, {
    id: event.id,
    task_id: current.id,
    created_at: current.updated_at,
    ...expected,
  });
}

test("Безопасность Supabase Data API", async (t) => {
  let env: ReturnType<typeof parseEnv>;
  try {
    env = parseEnv(readFileSync(".env.seed", "utf8"));
  } catch {
    throw new Error("Заполните .env.seed по инструкции в README.");
  }
  assert(env.SUPABASE_URL, "Заполните SUPABASE_URL в .env.seed");
  const url = new URL(env.SUPABASE_URL);
  const key = env.SUPABASE_PUBLISHABLE_KEY ?? "";
  assert(
    url.href === `${url.origin}/` &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" && url.hostname === "127.0.0.1")),
    "Укажите базовый URL проверочного Supabase",
  );
  assert(key.startsWith("sb_publishable_"), "Требуется publishable key");

  function client() {
    return createClient<Database>(url.origin, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  async function login(
    email: string,
    passwordVar: string,
    role: "manager" | "executor",
  ) {
    const api = client();
    const password = env[passwordVar];
    assert(password, `Заполните ${passwordVar} в .env.seed`);
    const { user } = data(
      await api.auth.signInWithPassword({ email, password }),
      `Вход ${email}`,
    );
    const profile = data(
      await api.from("profiles").select().eq("id", user.id).single(),
      `Профиль ${email}`,
    );
    assert.equal(profile.role, role, email);
    return { api, id: user.id };
  }

  const [manager, a, b] = await Promise.all([
    login("manager@example.com", "SEED_MANAGER_PASSWORD", "manager"),
    login("executor1@example.com", "SEED_EXECUTOR_1_PASSWORD", "executor"),
    login("executor2@example.com", "SEED_EXECUTOR_2_PASSWORD", "executor"),
  ]);
  assert.equal(new Set([manager.id, a.id, b.id]).size, 3);
  const managerApi = manager.api;
  const anon = client();
  const prefix = `security-${randomUUID()}`;

  function objects() {
    return managerApi
      .from("objects")
      .select()
      .like("name", `${prefix}%`)
      .order("id");
  }

  t.after(async () => {
    const active = data(
      await objects(),
      "Поиск объектов прогона для архивирования",
    );
    for (const { id } of active) {
      data(
        await managerApi.rpc("archive_object", { p_object_id: id }),
        `Архивирование ${id}`,
      );
    }
  });

  async function fixture(suffix: string, assignee: string) {
    const name = `${prefix}-${suffix}`;
    const object = data(
      await managerApi.rpc("create_object", { p_name: name, p_address: "" }),
      "Создание объекта",
    );
    const task = data(
      await managerApi.rpc("create_task", {
        p_object_id: object.id,
        p_title: name,
        p_description: "",
        p_assignee_id: assignee,
      }),
      "Создание задачи",
    );
    return { object, task };
  }

  const first = await fixture("a", a.id);
  const second = await fixture("b", b.id);
  const taskId = first.task.id;
  const objectId = first.object.id;
  const readTask = () => taskState(managerApi, taskId);

  await t.test("Гость и изоляция исполнителей", async () => {
    const tables = [
      ["profiles", anon.from("profiles")],
      ["objects", anon.from("objects")],
      ["tasks", anon.from("tasks")],
      ["task_events", anon.from("task_events")],
      ["profile_names", anon.from("profile_names")],
    ] as const;
    for (const [table, query] of tables) {
      const result = await query.select().limit(1);
      denied(result, "42501", `Чтение гостем ${table}`);
      assert.equal(result.data, null);
    }

    const visibleToB = await taskState(b.api, second.task.id);
    assert.deepEqual(visibleToB.tasks, [second.task]);
    assert.equal(visibleToB.events.length, 1);
    assert.deepEqual(await taskState(a.api, second.task.id), {
      tasks: [],
      events: [],
    });
    assert.deepEqual(
      data(
        await a.api.from("objects").select().eq("id", second.object.id),
        "Чужой объект",
      ),
      [],
    );
    assert.deepEqual(
      data(
        await a.api.from("objects").select().eq("id", objectId),
        "Свой объект",
      ),
      [first.object],
    );
    assert.deepEqual(await taskState(a.api, taskId), await readTask());
    assert.equal((await readTask()).events.length, 1);
  });

  await t.test(
    "Исполнитель не может управлять объектами, задачами и назначениями",
    async () => {
      const attemptedName = `${prefix}-forbidden`;
      const objectParams = {
        p_name: attemptedName,
        p_address: "Запрещённое изменение",
      };
      const taskParams = {
        p_object_id: objectId,
        p_title: attemptedName,
        p_description: "Изменение",
      };
      const reassignment = {
        p_task_id: taskId,
        p_expected_assignee_id: a.id,
        p_assignee_id: b.id,
      };
      const read = async () => ({
        objects: data(await objects(), "Объекты прогона"),
        created: data(
          await managerApi
            .from("tasks")
            .select()
            .eq("title", attemptedName)
            .order("id"),
          "Новые задачи",
        ),
        task: await readTask(),
      });

      await unchanged("create_object", "42501", read, () =>
        a.api.rpc("create_object", objectParams),
      );
      await unchanged("update_object", "42501", read, () =>
        a.api.rpc("update_object", {
          ...objectParams,
          p_object_id: objectId,
        }),
      );
      await unchanged("archive_object", "42501", read, () =>
        a.api.rpc("archive_object", { p_object_id: objectId }),
      );
      await unchanged("create_task", "42501", read, () =>
        a.api.rpc("create_task", {
          ...taskParams,
          p_assignee_id: a.id,
        }),
      );
      await unchanged("update_task", "42501", read, () =>
        a.api.rpc("update_task", {
          ...taskParams,
          p_task_id: taskId,
        }),
      );
      await unchanged("archive_task", "42501", readTask, () =>
        a.api.rpc("archive_task", { p_task_id: taskId }),
      );
      await unchanged("reassign_task", "42501", readTask, () =>
        a.api.rpc("reassign_task", reassignment),
      );
    },
  );

  await t.test("Прямые записи в задачи, историю и роль запрещены", async () => {
    const { events } = await readTask();
    assert.equal(events.length, 1);
    for (const { api, id } of [manager, a]) {
      await unchanged("UPDATE tasks.status", "42501", readTask, () =>
        api.from("tasks").update({ status: "accepted" }).eq("id", taskId),
      );
      await unchanged("UPDATE tasks.assignee_id", "42501", readTask, () =>
        api.from("tasks").update({ assignee_id: b.id }).eq("id", taskId),
      );
      await unchanged("UPDATE tasks.author_id", "42501", readTask, () =>
        api.from("tasks").update({ author_id: a.id }).eq("id", taskId),
      );
      await unchanged("INSERT task_events", "42501", readTask, () =>
        api.from("task_events").insert({
          task_id: taskId,
          actor_id: id,
          type: "status_changed",
          from_status: "new",
          to_status: "accepted",
        }),
      );
      await unchanged("UPDATE task_events", "42501", readTask, () =>
        api
          .from("task_events")
          .update({ comment: "Подмена" })
          .eq("id", events[0].id),
      );
      await unchanged("DELETE task_events", "42501", readTask, () =>
        api.from("task_events").delete().eq("id", events[0].id),
      );
    }

    const readProfile = async () =>
      data(
        await managerApi.from("profiles").select().eq("id", a.id).single(),
        "Повторное чтение профиля",
      );
    await unchanged("UPDATE profiles.role", "42501", readProfile, () =>
      a.api.from("profiles").update({ role: "manager" }).eq("id", a.id),
    );
  });

  await t.test(
    "Переходы, конкурентный конфликт, переназначение и терминальный статус",
    async () => {
      function statusEvent(
        actor: string,
        from: Status,
        to: Status,
        comment: string | null,
      ) {
        return {
          type: "status_changed",
          actor_id: actor,
          from_status: from,
          to_status: to,
          old_assignee_id: null,
          new_assignee_id: null,
          comment,
        } as const;
      }

      async function advance(
        actor: typeof a,
        from: Status,
        to: Status,
        comment: string | null = null,
      ) {
        const before = await readTask();
        data(
          await transition(actor.api, taskId, from, to, comment),
          `${from} → ${to}`,
        );
        assertEvent(
          before,
          await readTask(),
          { status: to },
          statusEvent(actor.id, from, to, comment),
        );
      }

      await unchanged("new → accepted", "22023", readTask, () =>
        transition(managerApi, taskId, "new", "accepted"),
      );
      await unchanged("Переход чужой задачи", "PT404", readTask, () =>
        transition(b.api, taskId, "new", "in_progress"),
      );
      await unchanged("Переход без сессии", "42501", readTask, () =>
        transition(anon, taskId, "new", "in_progress"),
      );

      const beforeRace = await readTask();
      const race = await Promise.all([
        transition(a.api, taskId, "new", "in_progress", "Попытка 1"),
        transition(a.api, taskId, "new", "in_progress", "Попытка 2"),
      ]);
      const winner = race.findIndex((result) => !result.error);
      assert(winner >= 0, "Одна конкурентная попытка должна пройти");
      denied(race[1 - winner], "PT409", "Вторая конкурентная попытка");
      assertEvent(
        beforeRace,
        await readTask(),
        { status: "in_progress" },
        statusEvent(a.id, "new", "in_progress", `Попытка ${winner + 1}`),
      );

      await advance(a, "in_progress", "in_review");
      await unchanged("in_review → in_progress", "22023", readTask, () =>
        transition(a.api, taskId, "in_review", "in_progress"),
      );
      await unchanged("Исполнитель принимает задачу", "22023", readTask, () =>
        transition(a.api, taskId, "in_review", "accepted"),
      );
      for (const comment of [null, " \t\n"]) {
        await unchanged(
          "Доработка без содержательного комментария",
          "22023",
          readTask,
          () => transition(managerApi, taskId, "in_review", "rework", comment),
        );
      }
      await advance(manager, "in_review", "rework", "Уточнить описание");

      const reassign = {
        p_task_id: taskId,
        p_expected_assignee_id: a.id,
        p_assignee_id: b.id,
      };
      assert.deepEqual(await taskState(b.api, taskId), {
        tasks: [],
        events: [],
      });
      const beforeReassign = await readTask();
      data(await managerApi.rpc("reassign_task", reassign), "Переназначение");
      const reassigned = await readTask();
      assertEvent(
        beforeReassign,
        reassigned,
        { assignee_id: b.id },
        {
          type: "assignee_changed",
          actor_id: manager.id,
          old_assignee_id: a.id,
          new_assignee_id: b.id,
          from_status: null,
          to_status: null,
          comment: null,
        },
      );
      assert.deepEqual(await taskState(a.api, taskId), {
        tasks: [],
        events: [],
      });
      assert.deepEqual(
        data(
          await a.api.from("objects").select().eq("id", objectId),
          "Объект после переназначения",
        ),
        [],
      );
      assert.deepEqual(await taskState(b.api, taskId), reassigned);
      assert.deepEqual(
        data(
          await b.api.from("objects").select().eq("id", objectId),
          "Объект нового исполнителя",
        ),
        [first.object],
      );
      await unchanged("Устаревшее переназначение", "PT409", readTask, () =>
        managerApi.rpc("reassign_task", reassign),
      );
      await unchanged("Переход прежним исполнителем", "PT404", readTask, () =>
        transition(a.api, taskId, "rework", "in_progress"),
      );

      await advance(b, "rework", "in_progress");
      await advance(b, "in_progress", "in_review");
      await advance(manager, "in_review", "accepted");
      await unchanged("accepted → in_progress", "22023", readTask, () =>
        transition(b.api, taskId, "accepted", "in_progress"),
      );
      await unchanged("accepted → rework", "22023", readTask, () =>
        transition(
          managerApi,
          taskId,
          "accepted",
          "rework",
          "Попытка повторного открытия",
        ),
      );
      await unchanged("Переназначение принятой задачи", "PT409", readTask, () =>
        managerApi.rpc("reassign_task", {
          ...reassign,
          p_expected_assignee_id: b.id,
          p_assignee_id: a.id,
        }),
      );
    },
  );
});
