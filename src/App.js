import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login/Login";
import Signup from "./pages/Signup/Signup";
import ChatPage from "./pages/Chat/ChatPage";
import JoinChannel from "./pages/Chat/JoinChannel";
import Home from "./pages/Home/Home";
import Dashboard from "./pages/Dashboard/Dashboard";
import VerifyEmail from "./pages/VerifyEmail/VerifyEmail";
import Onboarding from "./pages/Onboarding/Onboarding";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import PrivateRoute from "./components/PrivateRoute";
import { VoiceProvider } from "./voice/VoiceContext";

function App() {
  return (
    // Above the router: staying connected to a voice channel while moving between
    // chat, tasks and the dashboard is the whole point of a voice channel.
    <VoiceProvider>
      <Routes>
      <Route path="/">
        <Route index="true" element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
        <Route path="chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="chat/join/:channelId" element={<PrivateRoute><JoinChannel /></PrivateRoute>} />
        <Route path="workspace" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        </Route>
      </Routes>
    </VoiceProvider>
  );
}

export default App;
