import "./ChatPage.css";

import WorkspaceSidebar from "./Components/WorkspaceSidebar/WorkspaceSidebar";
import Sidebar from "./Components/Sidebar/Sidebar";
import ChatArea from "./Components/ChatArea/ChatArea";
import { useState } from "react";
import MembersList from "./Components/MembersList/MembersList";
export default function ChatPage() {
  const [activeChannel, setActiveChannel] = useState(null);

  return (
    <div className="chatPage">
      <WorkspaceSidebar></WorkspaceSidebar>
      <Sidebar
        activeChannel={activeChannel}
        setActiveChannel={setActiveChannel}
      />
      <ChatArea activeChannel={activeChannel} />
      <MembersList></MembersList>
    </div>
  );
}
