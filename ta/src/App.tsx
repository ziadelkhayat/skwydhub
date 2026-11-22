import AppLayout from "@/components/layout/app-layout";
import { useAuth } from "@/lib/auth";
import CrudPage from "@/skwyd/crud/CrudPage";
import { CRUD } from "@/skwyd/crud/configs";
import Dashboard from "@/skwyd/pages/Dashboard";
import NotMoved from "@/skwyd/pages/NotMoved";
import OrdersPage from "@/skwyd/pages/Orders";
import CustomersPage from "@/skwyd/pages/Customers";
import SignInPage from "@/skwyd/pages/SignIn";
import { Toaster } from "@/skwyd/ui/toast";
import "flatpickr/dist/flatpickr.css";
import { Route, Routes } from "react-router";

// Skwyd Hub back office on the TailAdmin template. Sections not rebuilt yet open in the current portal (NotMoved).
export default function App() {
  const { staff, loading, message } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900"><span className="size-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500" /></div>;
  if (!staff) return <SignInPage message={message} />;
  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          {Object.entries(CRUD).map(([k, cfg]) => <Route key={k} path={"/" + k} element={<CrudPage key={k} cfg={cfg} />} />)}
          <Route path="*" element={<NotMoved />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}
