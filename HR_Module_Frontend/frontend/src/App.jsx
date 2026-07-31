import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import LoginPage from "./features/auth/LoginPage";
import ProtectedRoute from "./features/auth/ProtectedRoute";
import AuthGate from "./features/auth/AuthGate";
import DashboardPage from "./features/dashboard/DashboardPage";
import JobPostingsPage from "./features/jobPostings/JobPostingsPage";
import ResumesPage from "./features/resumes/ResumesPage";
import ResumeDetailPage from "./features/resumes/ResumeDetailPage";
import ShortlistedCandidatesPage from "./features/shortlist/ShortlistedCandidatesPage";
import CandidateDetailPage from "./features/shortlist/CandidateDetailPage";
import EmployeeListPage from "./features/employees/EmployeeListPage";
import EmployeeDetailPage from "./features/employees/EmployeeDetailPage";
import AttendancePage from "./features/attendance/AttendancePage";
import AttendanceHistoryPage from "./features/attendance/AttendanceHistoryPage";
import AttendanceDashboardPage from "./features/attendanceAdmin/AttendanceDashboardPage";
import AdminAttendanceListPage from "./features/attendanceAdmin/AdminAttendanceListPage";
import EmployeeAttendanceDetailPage from "./features/attendanceAdmin/EmployeeAttendanceDetailPage";
import AnnouncementsListPage from "./features/announcements/AnnouncementsListPage";
import AnnouncementFormPage from "./features/announcements/AnnouncementFormPage";
import AnnouncementDetailPage from "./features/announcements/AnnouncementDetailPage";
import MyAnnouncementsListPage from "./features/myAnnouncements/MyAnnouncementsListPage";
import MyAnnouncementDetailPage from "./features/myAnnouncements/MyAnnouncementDetailPage";
import RolesListPage from "./features/roles/RolesListPage";
import RoleFormPage from "./features/roles/RoleFormPage";
import RoleDetailPage from "./features/roles/RoleDetailPage";
import { ROUTES } from "./constants/routes";
import { MODULES, ACTIONS } from "./constants/permissions";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route
          path={ROUTES.DASHBOARD}
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.JOB_POSTINGS}
          element={
            <ProtectedRoute permission={{ module: MODULES.JOB_POSTINGS, action: ACTIONS.READ }}>
              <JobPostingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.RESUMES}
          element={
            <ProtectedRoute permission={{ module: MODULES.RESUMES, action: ACTIONS.READ }}>
              <ResumesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.RESUME_DETAIL}
          element={
            <ProtectedRoute permission={{ module: MODULES.RESUMES, action: ACTIONS.READ }}>
              <ResumeDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.SHORTLIST}
          element={
            <ProtectedRoute permission={{ module: MODULES.CANDIDATES, action: ACTIONS.READ }}>
              <ShortlistedCandidatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.CANDIDATE_DETAIL}
          element={
            <ProtectedRoute permission={{ module: MODULES.CANDIDATES, action: ACTIONS.READ }}>
              <CandidateDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.EMPLOYEES}
          element={
            <ProtectedRoute permission={{ module: MODULES.EMPLOYEES, action: ACTIONS.READ }}>
              <EmployeeListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.EMPLOYEE_DETAIL}
          element={
            <ProtectedRoute permission={{ module: MODULES.EMPLOYEES, action: ACTIONS.READ }}>
              <EmployeeDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ATTENDANCE}
          element={
            <ProtectedRoute
              permission={{ module: MODULES.ATTENDANCE, action: ACTIONS.VIEW_OWN }}
              blockSuperAdmin
            >
              <AttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ATTENDANCE_HISTORY}
          element={
            <ProtectedRoute
              permission={{ module: MODULES.ATTENDANCE, action: ACTIONS.VIEW_OWN }}
              blockSuperAdmin
            >
              <AttendanceHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ATTENDANCE_ADMIN}
          element={
            <ProtectedRoute permission={{ module: MODULES.ATTENDANCE, action: ACTIONS.VIEW_ALL }}>
              <AttendanceDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ATTENDANCE_ADMIN_LIST}
          element={
            <ProtectedRoute permission={{ module: MODULES.ATTENDANCE, action: ACTIONS.VIEW_ALL }}>
              <AdminAttendanceListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ATTENDANCE_ADMIN_DETAIL}
          element={
            <ProtectedRoute permission={{ module: MODULES.ATTENDANCE, action: ACTIONS.VIEW_ALL }}>
              <EmployeeAttendanceDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ANNOUNCEMENTS}
          element={
            <ProtectedRoute permission={{ module: MODULES.ANNOUNCEMENTS, action: ACTIONS.READ }}>
              <AnnouncementsListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ANNOUNCEMENT_NEW}
          element={
            <ProtectedRoute permission={{ module: MODULES.ANNOUNCEMENTS, action: ACTIONS.CREATE }}>
              <AnnouncementFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ANNOUNCEMENT_EDIT}
          element={
            <ProtectedRoute permission={{ module: MODULES.ANNOUNCEMENTS, action: ACTIONS.UPDATE }}>
              <AnnouncementFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ANNOUNCEMENT_DETAIL}
          element={
            <ProtectedRoute permission={{ module: MODULES.ANNOUNCEMENTS, action: ACTIONS.READ }}>
              <AnnouncementDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.MY_ANNOUNCEMENTS}
          element={
            <ProtectedRoute
              permission={{ module: MODULES.ANNOUNCEMENTS, action: ACTIONS.VIEW_OWN }}
              blockSuperAdmin
            >
              <MyAnnouncementsListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.MY_ANNOUNCEMENT_DETAIL}
          element={
            <ProtectedRoute
              permission={{ module: MODULES.ANNOUNCEMENTS, action: ACTIONS.VIEW_OWN }}
              blockSuperAdmin
            >
              <MyAnnouncementDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ROLES_LIST}
          element={
            <ProtectedRoute permission={{ module: MODULES.ROLES, action: ACTIONS.READ }}>
              <RolesListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ROLE_NEW}
          element={
            <ProtectedRoute permission={{ module: MODULES.ROLES, action: ACTIONS.CREATE }}>
              <RoleFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ROLE_EDIT}
          element={
            <ProtectedRoute permission={{ module: MODULES.ROLES, action: ACTIONS.UPDATE }}>
              <RoleFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ROLE_DETAIL}
          element={
            <ProtectedRoute permission={{ module: MODULES.ROLES, action: ACTIONS.READ }}>
              <RoleDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthGate>
        <AnimatedRoutes />
      </AuthGate>
    </BrowserRouter>
  );
}

export default App;
