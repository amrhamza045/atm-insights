export default function Logo({ className = "h-12" }) {
  return (
    <img 
      src="https://media.base44.com/images/public/6a8b0b3fb73ae7d930386c1d/bce4ae79c_7.png"
      alt="VeraKit 360"
      className={`${className} w-auto object-contain`}
    />
  );
}