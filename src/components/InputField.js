import "./InputField.css";

export default function InputField({
  label,
  type,
  placeholder,
  value,
  onChange,
}) {
  return (
    <div className="input-group">
      <label >{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
