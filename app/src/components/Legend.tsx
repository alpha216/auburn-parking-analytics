import './Legend.css';

export function Legend() {
    return (
        <div className="legend">
            <span className="legend-label">Occupancy:</span>
            <div className="legend-gradient">
                <div className="gradient-bar"></div>
                <div className="gradient-labels">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                </div>
            </div>
            <div className="legend-no-data">
                <div className="no-data-box"></div>
                <span>No data</span>
            </div>
        </div>
    );
}
