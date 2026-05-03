export function SettingsSlider({ item, value, onChange }) {
  const percentage = ((value - item.min) / (item.max - item.min)) * 100;
  return (
    <div className="slider-container">
      <div className="slider-header">
        <label>{item.label}</label>
        <span className="slider-value">
          {item.format ? item.format(value) : value.toFixed(2)}
        </span>
      </div>
      <div className="slider-track-wrap">
        <div className="slider-fill" style={{ width: `${percentage}%` }} />
        <input 
          type="range" 
          min={item.min} 
          max={item.max} 
          step={item.step} 
          value={value} 
          onChange={(e) => onChange(item.key, parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
}
