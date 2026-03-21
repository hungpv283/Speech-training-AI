import UserInfoPage from "@/page/UserInfoPage";
import RecordingPage from "@/page/RecordingPage";
import ThankYouPage from "@/page/ThankYouPage";
import LoginPage from "@/page/LoginPage";
import ErrorPage from "@/page/ErrorPage";
import AdminDashboard from "@/page/Admin/Dashboard";
import AdminManagerUsers from "@/page/Admin/ManagerUsers";
import AdminManagerRecords from "@/page/Admin/ManagerRecords";
import AdminManagerSentences from "@/page/Admin/ManagerSentences";
import ManagerDashboard from "@/page/Manager/Dashboard";
import ManagerManagerUsers from "@/page/Manager/ManagerUsers";
import ManagerManagerRecords from "@/page/Manager/ManagerRecords";
import ManagerManagerSentences from "@/page/Manager/ManagerSentences";
import ProtectedRoute from "./ProtectedRoute";
import { Route, Routes } from "react-router-dom";
import LoginUser from "@/page/User/LoginUser";
import UserProfile from "@/page/User/UserProfile";
import TopScore from "@/page/User/TopScore";



const AppRouter = () => {
    return (
        <Routes>
            <Route path="/" element={<UserInfoPage />} />
            <Route path="/recording" element={<RecordingPage />} />
            <Route path="/thank-you" element={<ThankYouPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/error" element={<ErrorPage />} />
            <Route path="/login-user" element={<LoginUser />} />
            
            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={<ProtectedRoute element={<AdminDashboard />} requiredRole="Admin" />} />
            <Route path="/admin/recording" element={<ProtectedRoute element={<AdminManagerRecords />} requiredRole="Admin" />} />
            <Route path="/admin/users" element={<ProtectedRoute element={<AdminManagerUsers />} requiredRole="Admin" />} />
            <Route path="/admin/sentences" element={<ProtectedRoute element={<AdminManagerSentences />} requiredRole="Admin" />} />

            
            {/* Manager Routes */}
            <Route path="/manager/dashboard" element={<ProtectedRoute element={<ManagerDashboard />} requiredRole="Manager" />} />
            <Route path="/manager/recording" element={<ProtectedRoute element={<ManagerManagerRecords />} requiredRole="Manager" />} />
            <Route path="/manager/users" element={<ProtectedRoute element={<ManagerManagerUsers />} requiredRole="Manager" />} />
            <Route path="/manager/sentences" element={<ProtectedRoute element={<ManagerManagerSentences />} requiredRole="Manager" />} />

            {/* User Routes */}
            <Route path="/user/profile" element={<ProtectedRoute element={<UserProfile />} requiredRole="User" />} />
            <Route path="/user/top-score" element={<ProtectedRoute element={<TopScore />} requiredRole="User" />} />
            
            {/* 404 - Catch all */}
            <Route path="*" element={<ErrorPage />} />
        </Routes>
    );
}

export default AppRouter;