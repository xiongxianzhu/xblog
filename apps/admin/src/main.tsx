import { Result, Spin } from "antd";
import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminAuthGate } from "@/components/admin/auth-gate";
import { AdminThemeProvider } from "@/components/admin/theme-provider";
import { AntProvider } from "@/components/ant-provider";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { AdminLocaleProvider } from "@/lib/locale";
import "antd/dist/reset.css";
import "./styles.css";
import "./admin-design.css";

const Page0 = lazy(() => import("./app/admin/(public)/page"));
const Page1 = lazy(() => import("./app/admin/(public)/reset-password/page"));
const Page2 = lazy(() => import("./app/admin/(shell)/about/page"));
const Page3 = lazy(() => import("./app/admin/(shell)/ai/models/page"));
const Page4 = lazy(() => import("./app/admin/(shell)/ai/skills/page"));
const Page5 = lazy(() => import("./app/admin/(shell)/dashboard/page"));
const Page6 = lazy(() => import("./app/admin/(shell)/links/page"));
const Page7 = lazy(() => import("./app/admin/(shell)/logs/login/page"));
const Page8 = lazy(() => import("./app/admin/(shell)/logs/operations/page"));
const Page9 = lazy(() => import("./app/admin/(shell)/password/page"));
const Page10 = lazy(() => import("./app/admin/(shell)/posts/page"));
const Page11 = lazy(() => import("./app/admin/(shell)/posts/new/page"));
const Page12 = lazy(() => import("./app/admin/(shell)/posts/[id]/edit/page"));
const Page13 = lazy(() => import("./app/admin/(shell)/profile/page"));
const Page14 = lazy(() => import("./app/admin/(shell)/projects/page"));
const Page15 = lazy(() => import("./app/admin/(shell)/settings/page"));
const Page16 = lazy(() => import("./app/admin/(shell)/users/page"));
const UserEditorPage = lazy(() => import("./app/admin/(shell)/users/editor-page"));
const UserDetailPage = lazy(() => import("./app/admin/(shell)/users/detail-page"));
const LogDetailPage = lazy(() => import("./app/admin/(shell)/logs/detail-page"));
const PostDetailPage = lazy(() => import("./app/admin/(shell)/posts/detail-page"));
const LinkEditorPage = lazy(() => import("./app/admin/(shell)/links/editor-page"));
const MediaLibraryPage = lazy(() => import("./app/admin/(shell)/media/page"));
function ProtectedLayout() {
  return (
    <AdminAuthGate>
      <AdminShell>
        <Suspense
          fallback={
            <div className="p-8 text-center">
              <Spin />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </AdminShell>
    </AdminAuthGate>
  );
}
function PublicLayout() {
  return (
    <AdminAuthGate>
      <div className="admin-auth-layout">
        <div className="admin-auth-toolbar">
          <LocaleSwitcher />
        </div>
        <main className="admin-auth-page">
          <Outlet />
        </main>
      </div>
    </AdminAuthGate>
  );
}
function Root() {
  return (
    <BrowserRouter basename="/admin">
      <AdminLocaleProvider>
        <AdminThemeProvider>
          <AntProvider>
            <Suspense
              fallback={
                <div className="p-12 text-center">
                  <Spin />
                </div>
              }
            >
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route path="" element={<Page0 />} />
                  <Route path="reset-password" element={<Page1 />} />
                  <Route path="require-password-change" element={<Page9 requiredChange />} />
                </Route>
                <Route element={<ProtectedLayout />}>
                  <Route path="about" element={<Page2 />} />
                  <Route path="ai/models" element={<Page3 />} />
                  <Route path="ai/skills" element={<Page4 />} />
                  <Route path="dashboard" element={<Page5 />} />
                  <Route path="links" element={<Page6 />} />
                  <Route path="links/new" element={<LinkEditorPage key="new" />} />
                  <Route path="links/:id/edit" element={<LinkEditorPage key="edit" />} />
                  <Route path="logs/login" element={<Page7 />} />
                  <Route path="logs/login/:id" element={<LogDetailPage kind="login" />} />
                  <Route path="logs/operations" element={<Page8 />} />
                  <Route path="logs/operations/:id" element={<LogDetailPage kind="operation" />} />
                  <Route path="password" element={<Page9 />} />
                  <Route path="posts" element={<Page10 />} />
                  <Route path="media" element={<MediaLibraryPage />} />
                  <Route path="posts/:id" element={<PostDetailPage />} />
                  <Route path="posts/new" element={<Page11 />} />
                  <Route path="posts/:id/edit" element={<Page12 />} />
                  <Route path="profile" element={<Page13 />} />
                  <Route path="projects" element={<Page14 />} />
                  <Route path="settings" element={<Page15 />} />
                  <Route path="users" element={<Page16 />} />
                  <Route path="users/:id" element={<UserDetailPage />} />
                  <Route path="users/new" element={<UserEditorPage key="new" />} />
                  <Route path="users/:id/edit" element={<UserEditorPage key="edit" />} />
                </Route>
                <Route path="logs" element={<Navigate to="/logs/operations" replace />} />
                <Route path="settings/ai" element={<Navigate to="/ai/models" replace />} />
                <Route path="settings/skills" element={<Navigate to="/ai/skills" replace />} />
                <Route
                  path="*"
                  element={
                    <Result
                      status="404"
                      title="404"
                      subTitle="页面不存在"
                      extra={<a href="/admin/dashboard">返回后台</a>}
                    />
                  }
                />
              </Routes>
            </Suspense>
          </AntProvider>
        </AdminThemeProvider>
      </AdminLocaleProvider>
    </BrowserRouter>
  );
}
const root = document.getElementById("root");
if (root) createRoot(root).render(<Root />);
