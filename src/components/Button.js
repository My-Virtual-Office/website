import "./Button.css";

export default function Button({ children, onClick, type = "button", ...props }) {
  return (
    <button className="btn" type={type} onClick={onClick} {...props}>
      {children}
    </button>
  );
}
