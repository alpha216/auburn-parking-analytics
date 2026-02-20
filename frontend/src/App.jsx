import useHeatmapData from "./hooks/useHeatmapData";
import Header from "./components/Header";
import HeatmapGrid from "./components/HeatmapGrid";
import Legend from "./components/Legend";

export default function App() {
  const {
    meta,
    processed,
    loading,
    error,
    selectedLots,
    dayRange,
    cellSize,
    startHour,
    endHour,
    setDayRange,
    setCellSize,
    setStartHour,
    setEndHour,
    toggleLot,
  } = useHeatmapData();

  if (error) {
    return (
      <div className="loading" style={{ color: "#f44336" }}>
        Error: {error}
      </div>
    );
  }

  return (
    <>
      <Header
        lots={meta?.lots || []}
        selectedLots={selectedLots}
        toggleLot={toggleLot}
        dayRange={dayRange}
        setDayRange={setDayRange}
        cellSize={cellSize}
        setCellSize={setCellSize}
        startHour={startHour}
        endHour={endHour}
        setStartHour={setStartHour}
        setEndHour={setEndHour}
        dateRange={processed?.range}
      />

      <div className="main">
        {loading ? (
          <div className="loading">
            <div className="loading__spinner" />
            Loading heatmap data…
          </div>
        ) : (
          <>
            {selectedLots
              .filter((lot) => processed?.lots[lot])
              .map((lot) => (
                <HeatmapGrid
                  key={lot}
                  lotName={lot}
                  matrix={processed.lots[lot].matrix}
                  counts={processed.lots[lot].counts}
                  xLabels={processed.xLabels}
                  yLabels={processed.yLabels}
                />
              ))}
            <Legend />
          </>
        )}
      </div>
    </>
  );
}
