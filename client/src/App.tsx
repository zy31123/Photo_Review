import { Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import ErrorBoundary from './components/ui/ErrorBoundary'
import HomePage from './pages/HomePage'
import GridPage from './pages/GridPage'
import ReviewPage from './pages/ReviewPage'
import RandomPage from './pages/RandomPage'
import SimilarPage from './pages/SimilarPage'

export default function App() {
  return (
    <AppProvider>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/grid" element={<GridPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/random" element={<RandomPage />} />
          <Route path="/similar" element={<SimilarPage />} />
        </Routes>
      </ErrorBoundary>
    </AppProvider>
  )
}
