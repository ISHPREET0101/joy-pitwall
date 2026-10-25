import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { WeekendLayout } from './components/Layout';
import HomePage from './features/home/HomePage';
import NewWeekendPage from './features/home/NewWeekendPage';
import OverviewPage from './features/weekend/OverviewPage';
import TimetablePage from './features/weekend/TimetablePage';
import TrackMapPage from './features/weekend/TrackMapPage';
import ConditionsPage from './features/weekend/ConditionsPage';
import RulesPage from './features/weekend/RulesPage';
import ChecklistPage from './features/weekend/ChecklistPage';
import CalculatorsPage from './features/weekend/CalculatorsPage';
import NotesPage from './features/weekend/NotesPage';
import GaragePage from './features/garage/GaragePage';
import CarPage from './features/car/CarPage';
import ComparePage from './features/analysis/ComparePage';
import ReportsPage from './features/analysis/ReportsPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/new" element={<NewWeekendPage />} />
        <Route path="/w/:id" element={<WeekendLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="timetable" element={<TimetablePage />} />
          <Route path="map" element={<TrackMapPage />} />
          <Route path="conditions" element={<ConditionsPage />} />
          <Route path="rules" element={<RulesPage />} />
          <Route path="checklists" element={<ChecklistPage />} />
          <Route path="calcs" element={<CalculatorsPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="garage" element={<GaragePage />} />
          <Route path="car/:carId/:sub?" element={<CarPage />} />
          <Route path="compare" element={<ComparePage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
