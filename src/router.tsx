import { Navigate, createBrowserRouter } from "react-router-dom";

import { LoginPage } from "@/pages/login/login-page";
import { MyTasksPage } from "@/pages/my-tasks/my-tasks-page";
import { NotFoundPage } from "@/pages/not-found/not-found-page";
import { ObjectDetailPage } from "@/pages/object-detail/object-detail-page";
import { ObjectsPage } from "@/pages/objects/objects-page";
import { TaskDetailPage } from "@/pages/task-detail/task-detail-page";

import { ROUTERS } from "@/shared/constants/routers";

import { AppLayout } from "@/features/navigation/app-layout";

export const router = createBrowserRouter([
  { path: ROUTERS.MAIN, element: <Navigate to={ROUTERS.OBJECTS} replace /> },
  { path: ROUTERS.LOGIN, element: <LoginPage /> },
  {
    element: <AppLayout />,
    children: [
      { path: ROUTERS.OBJECTS, element: <ObjectsPage /> },
      { path: ROUTERS.OBJECT_DETAIL, element: <ObjectDetailPage /> },
      { path: ROUTERS.TASK_DETAIL, element: <TaskDetailPage /> },
      { path: ROUTERS.MY_TASKS, element: <MyTasksPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
