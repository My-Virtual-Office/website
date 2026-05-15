// import { useState } from "react";
// import { getUserProfile } from "../../api/user";

export default function Dashboard() {
  // const [user, setUser] = useState(null);
  // const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   const fetchUser = async () => {
  //     try {
  //       const userData = await getUserProfile();
  //       setUser(userData);
  //     } catch (error) {
  //       console.error("Error fetching user profile:", error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchUser();
  // }, []);

  // if (loading) {
  //   return (
  //     <div
  //       style={{
  //         display: "flex",
  //         justifyContent: "center",
  //         alignItems: "center",
  //         height: "100vh",
  //       }}
  //     >
  //       Loading...
  //     </div>
  //   );
  // }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontSize: "2rem",
      }}
    >
      <div>Dashboard</div>
      {/* <div style={{ fontWeight: "bold", color: "#007bff", marginTop: "10px" }}>
        {user ? `${user.firstName} ${user.lastName}` : "User"}
      </div> */}
    </div>
  );
}
