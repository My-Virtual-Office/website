import "./Button.css";

export default function Button({ children, onClick, disabled , type = "button", ...props }) {
  return (
    <button className="btn" type={type} onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  );
}
