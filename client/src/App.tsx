import { Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import HomePage from './pages/HomePage'
import GridPage from './pages/GridPage'
import ReviewPage from './pages/ReviewPage'
import RandomPage from './pages/RandomPage'

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/grid" element={<GridPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/random" element={<RandomPage />} />
      </Routes>
    </AppProvider>
  )
}
