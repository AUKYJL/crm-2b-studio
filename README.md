# СтройКонтроль

CRM для строительных объектов и задач. Постановщик видит все активные объекты и задачи, управляет ими, назначает исполнителей, принимает работу или возвращает её с комментарием. Исполнитель видит свои задачи и связанные объекты, берёт задачи в работу и отправляет на проверку. В карточке задачи доступна история действий.

React, TypeScript, Vite, React Router, TanStack Query, Zustand, Tailwind CSS и shadcn/ui. Supabase Auth обеспечивает вход по email и паролю. PostgreSQL хранит профили (`profiles`), объекты (`objects`), задачи (`tasks`) и события (`task_events`). Приложение читает данные через Data API с проверкой прав на строки (RLS) и меняет их через RPC. База проверяет роли и переходы и записывает историю вместе с изменением задачи.

## Подключение Supabase Cloud

1. Используйте Node.js 26 и установите зависимости через `npm ci`.
2. Создайте отдельный пустой проект Supabase для проверки. В настройках Auth выключите **Allow new users to sign up**, оставив вход через Email включённым. В настройках Data API оставьте доступной схему `public`. [Настройки Auth](https://supabase.com/docs/guides/auth/general-configuration)
3. Выполните команды в корне проекта. Вместо `PROJECT_REF` укажите идентификатор проекта из Supabase.

   ```sh
   npx supabase@3.0.0 login
   npx supabase@3.0.0 link --project-ref PROJECT_REF
   npx supabase@3.0.0 migration list --remote
   npx supabase@3.0.0 db push --remote --dry-run
   ```

   Сверьте целевой проект и список миграций, затем вручную выполните `npx supabase@3.0.0 db push --remote` и подтвердите применение. После обновления схемы команда `npm run db:types` обновляет `src/shared/api/database.types.ts` из схемы `public` привязанного проекта. [Режимы Supabase CLI](https://supabase.com/docs/guides/local-development/local-and-hosted-projects)

## Запуск и проверка

1. Скопируйте `.env.example` в `.env.local`. Заполните `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY` значениями **Project URL** и **Publishable key** из Supabase.
2. Скопируйте `.env.seed.example` в `.env.seed`. Укажите URL и publishable key того же проекта, отдельный secret key и три разных пароля по правилам Auth проекта. Выполните локально `npm run seed:demo`. Скрипт наполняет подключённый облачный проект и рассчитан на один запуск в пустом проекте. После частичного запуска используйте новый пустой проект с применёнными миграциями.
3. Запустите `npm run dev` и откройте `/login`. Список аккаунтов и ожидаемый результат проверки приведены в [чек-листе](docs/DEPLOY_CHECKLIST.md).

```sh
npm run lint
npm run build
npm run preview
```

`build` проверяет TypeScript и собирает приложение в `dist/`. На выделенном проверочном проекте выполните `npm run test:security`. Тесты используют URL, publishable key и пароли из `.env.seed`, проверяют доступ через Data API и RPC и архивируют созданные объекты `security-*` при штатном завершении. После принудительной остановки оставшиеся объекты можно архивировать из аккаунта постановщика.

## Публикация

Импортируйте репозиторий GitHub в Vercel с пресетом **Vite**, Node.js 26, командой `npm run build` и каталогом `dist`. Укажите обе переменные из `.env.example` для Production перед сборкой. `vercel.json` направляет прямые ссылки на экран приложения через `index.html`. [Vite на Vercel](https://vercel.com/docs/frameworks/frontend/vite)

Переменные `VITE_*` попадают в браузер. Secret key и пароли храните локально в игнорируемом `.env.seed`. В Git оставляйте только пустые шаблоны. Пароли проверочных аккаунтов передавайте отдельно в личном сообщении на hh. [Ключи Supabase](https://supabase.com/docs/guides/getting-started/api-keys)

[Описание для руководителя](docs/HANDOFF.md) · [Допущения и ограничения](docs/ASSUMPTIONS.md) · [Чек-лист и шаблон сообщения на hh](docs/DEPLOY_CHECKLIST.md)
