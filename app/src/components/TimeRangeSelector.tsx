import './TimeRangeSelector.css';

interface TimeRangeSelectorProps {
    startHour: number;
    endHour: number;
    onStartHourChange: (hour: number) => void;
    onEndHourChange: (hour: number) => void;
}

const HOURS = Array.from({ length: 25 }, (_, i) => i); // 0-24

export function TimeRangeSelector({
    startHour,
    endHour,
    onStartHourChange,
    onEndHourChange,
}: TimeRangeSelectorProps) {
    const formatHour = (hour: number) => {
        if (hour === 24) return '24:00';
        return `${hour.toString().padStart(2, '0')}:00`;
    };

    const handleStartChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStart = parseInt(e.target.value, 10);
        onStartHourChange(newStart);
        // Ensure end hour is always greater than start hour
        if (newStart >= endHour) {
            onEndHourChange(Math.min(newStart + 1, 24));
        }
    };

    const handleEndChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newEnd = parseInt(e.target.value, 10);
        onEndHourChange(newEnd);
    };

    // Valid end hours are those greater than start hour
    const validEndHours = HOURS.filter((h) => h > startHour);

    return (
        <div className="time-range-selector">
            <span className="time-range-label">Hours:</span>
            <div className="time-selectors">
                <select
                    className="hour-select"
                    value={startHour}
                    onChange={handleStartChange}
                >
                    {HOURS.slice(0, 24).map((hour) => (
                        <option key={hour} value={hour}>
                            {formatHour(hour)}
                        </option>
                    ))}
                </select>
                <span className="time-separator">~</span>
                <select
                    className="hour-select"
                    value={endHour}
                    onChange={handleEndChange}
                >
                    {validEndHours.map((hour) => (
                        <option key={hour} value={hour}>
                            {formatHour(hour)}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
