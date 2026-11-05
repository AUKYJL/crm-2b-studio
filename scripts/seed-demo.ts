import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

import type { Database } from "../src/shared/api/database.types.ts";

type Role = Database["public"]["Enums"]["user_role"];
type Status = Database["public"]["Enums"]["task_status"];

const objects = [
  {
    name: "ЖК «Северный парк»",
    address: "ул. Лесная, 18",
    tasks: [
      {
        title: "Разметить трассы кабельных лотков",
        description: "Сверить разметку с планом второго этажа.",
        executor: 0,
        status: "new",
      },
      {
        title: "Проверить гидроизоляцию подвала",
        description: "Осмотреть примыкания у вводов коммуникаций.",
        executor: 1,
        status: "in_progress",
      },
      {
        title: "Подготовить акт скрытых работ",
        description: "Приложить фотографии армирования плиты.",
        executor: 0,
        status: "in_review",
      },
    ],
  },
  {
    name: "БЦ «Маяк»",
    address: "наб. Речная, 7",
    tasks: [
      {
        title: "Проверить крепления воздуховодов",
        description: "Осмотреть подвесы в коридоре третьего этажа.",
        executor: 1,
        status: "rework",
      },
      {
        title: "Проверить уклон водостока",
        description: "Зафиксировать результаты замеров на кровле.",
        executor: 0,
        status: "accepted",
      },
    ],
  },
] as const;

const executorSteps = ["in_progress", "in_review"] as const;
const paths: Record<Status, readonly Status[]> = {
  new: [],
  in_progress: ["in_progress"],
  in_review: executorSteps,
  rework: [...executorSteps, "rework"],
  accepted: [...executorSteps, "accepted"],
};

const auth = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
};
const repeatMessage =
  "Проект уже содержит пользователей или профили. Для запуска используйте новый пустой проверочный проект.";

function requireData<T>(
  result: { data: T; error: null } | { error: { code?: string } },
  action: string,
): T {
  if (result.error)
    throw new Error(`${action}: ${result.error.code ?? "неизвестная ошибка"}.`);
  return result.data;
}

async function seed() {
  let env: ReturnType<typeof parseEnv>;
  try {
    env = parseEnv(readFileSync(".env.seed", "utf8"));
  } catch {
    throw new Error(
      "Создайте .env.seed на основе .env.seed.example и заполните его.",
    );
  }

  function required(name: string) {
    const value = env[name];
    if (!value?.trim()) throw new Error(`Заполните ${name} в .env.seed.`);
    return value;
  }

  const url = new URL(required("SUPABASE_URL"));
  const publishableKey = required("SUPABASE_PUBLISHABLE_KEY");
  const secretKey = required("SUPABASE_SECRET_KEY");
  if (url.protocol !== "https:" || url.href !== `${url.origin}/`) {
    throw new Error("Укажите базовый HTTPS URL проекта Supabase в .env.seed.");
  }
  if (
    !publishableKey.startsWith("sb_publishable_") ||
    !secretKey.startsWith("sb_secret_")
  ) {
    throw new Error(
      "Укажите publishable key и secret key проекта Supabase в .env.seed.",
    );
  }

  const accounts = [
    {
      email: "manager@example.com",
      fullName: "Ирина Соколова",
      role: "manager",
      password: required("SEED_MANAGER_PASSWORD"),
    },
    {
      email: "executor1@example.com",
      fullName: "Алексей Морозов",
      role: "executor",
      password: required("SEED_EXECUTOR_1_PASSWORD"),
    },
    {
      email: "executor2@example.com",
      fullName: "Дмитрий Волков",
      role: "executor",
      password: required("SEED_EXECUTOR_2_PASSWORD"),
    },
  ] satisfies {
    email: string;
    fullName: string;
    role: Role;
    password: string;
  }[];

  const admin = createClient<Database>(url.origin, secretKey, { auth });
  const users = requireData(
    await admin.auth.admin.listUsers({ page: 1, perPage: 1 }),
    "Проверка пользователей",
  );
  const profiles = requireData(
    await admin.from("profiles").select("id").limit(1),
    "Проверка профилей",
  );
  if (users.users.length || profiles.length) throw new Error(repeatMessage);

  async function provision(account: (typeof accounts)[number]) {
    // The fixed, unique manager email also stops concurrent runs before any tasks are created.
    const result = await admin.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
    });
    if (
      result.error?.code === "email_exists" ||
      result.error?.code === "user_already_exists"
    ) {
      throw new Error(repeatMessage);
    }
    const { user } = requireData(result, `Создание аккаунта ${account.email}`);
    if (!user) throw new Error(`Auth не вернул пользователя ${account.email}.`);

    const { error } = await admin.from("profiles").insert({
      id: user.id,
      full_name: account.fullName,
      role: account.role,
    });
    if (error)
      throw new Error(`Создание профиля ${account.email}: ${error.code}.`);

    const client = createClient<Database>(url.origin, publishableKey, { auth });
    requireData(
      await client.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      }),
      `Вход ${account.email}`,
    );
    return { client, id: user.id };
  }

  const manager = await provision(accounts[0]);
  const executors = [
    await provision(accounts[1]),
    await provision(accounts[2]),
  ] as const;

  for (const object of objects) {
    const createdObject = requireData(
      await manager.client.rpc("create_object", {
        p_name: object.name,
        p_address: object.address,
      }),
      `Создание объекта «${object.name}»`,
    );

    for (const task of object.tasks) {
      const executor = executors[task.executor];
      const createdTask = requireData(
        await manager.client.rpc("create_task", {
          p_object_id: createdObject.id,
          p_title: task.title,
          p_description: task.description,
          p_assignee_id: executor.id,
        }),
        `Создание задачи «${task.title}»`,
      );

      let status = createdTask.status;
      for (const next of paths[task.status]) {
        const actor =
          next === "accepted" || next === "rework" ? manager : executor;
        const updatedTask = requireData(
          await actor.client.rpc("transition_task", {
            p_task_id: createdTask.id,
            p_expected_status: status,
            p_to_status: next,
            p_comment:
              next === "rework"
                ? "Добавьте фото креплений у шахты на третьем этаже."
                : undefined,
          }),
          `Переход задачи «${task.title}» в ${next}`,
        );
        status = updatedTask.status;
      }
    }
  }

  console.log(
    "Созданы постановщик, два исполнителя, два объекта и пять задач.",
  );
}

seed().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Не удалось заполнить проект.",
  );
  console.error(
    "После частичного выполнения используйте новый пустой проверочный проект.",
  );
  process.exitCode = 1;
});
