import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import PageTransition from "./PageTransition";
import { useUIStore } from "../store/uiStore";

export default function Layout({ title, children }) {
  const expanded = useUIStore((s) => s.sidebarExpanded);
  const location = useLocation();

  return (
    <>
      <Sidebar />
      <div
        className={`min-h-screen flex flex-col transition-[margin] duration-300 ease-in-out ${
          expanded ? "ml-sidebar-width" : "ml-sidebar-collapsed"
        }`}
      >
        <TopBar title={title} />
        <main className="flex-1 p-xl max-w-container-max mx-auto w-full">
          <PageTransition key={location.pathname}>{children}</PageTransition>
        </main>
      </div>
    </>
  );
}
