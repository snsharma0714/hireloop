import React from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Home from './pages/Home'
import ForCompanies from './pages/ForCompanies'
import Auth from './pages/Auth'
import { useEffect } from 'react'
import axios from 'axios'
import { useDispatch, useSelector } from 'react-redux'
import { setUserData } from './redux/userSlice'
import InterviewPage from './pages/InterviewPage'
import InterviewHistory from './pages/InterviewHistory'
import Pricing from './pages/Pricing'
import InterviewReport from './pages/InterviewReport'
import HiringDashboard from './pages/HiringDashboard'
import Dashboard from './pages/Dashboard'
import InterviewRoom from './pages/InterviewRoom'
import InterviewFeedback from './pages/InterviewFeedback'
import Practice from './pages/Practice'
import ProblemPage from './pages/ProblemPage'
import SheetPage from './pages/SheetPage'
import Onboarding from './pages/Onboarding'
import Jobs from './pages/Jobs'
import JobDetail from './pages/JobDetail'
import MyApplications from './pages/MyApplications'
import Profile from './pages/Profile'
import CompanyJobs from './pages/CompanyJobs'
import JobPipeline from './pages/JobPipeline'
import RequireRole from './components/RequireRole'
import CompanyLayout from './components/company/CompanyLayout'
import CompanyHome from './pages/company/CompanyHome'
import Team from './pages/company/Team'
import OrgSettings from './pages/company/OrgSettings'
import AcceptInvite from './pages/AcceptInvite'
import Candidates from './pages/company/Candidates'
import CandidateProfile from './pages/company/CandidateProfile'
import Calendar from './pages/company/Calendar'
import Reports from './pages/company/Reports'
import Careers from './pages/Careers'
import CareersJob from './pages/CareersJob'

// company pages live inside the workspace sidebar
const Company = ({ children }) => <RequireRole role='company'><CompanyLayout>{children}</CompanyLayout></RequireRole>

// In production the backend serves this app, so API calls go to the same origin
export const ServerUrl = import.meta.env.VITE_SERVER_URL ?? (import.meta.env.PROD ? "" : "http://localhost:8001")

function App() {

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { userData } = useSelector((state) => state.user)

  // New accounts pick student or company before using the app (interview links still open directly)
  useEffect(() => {
    const exempt = ["/onboarding", "/room/", "/invite/", "/careers/"].some(p => location.pathname.startsWith(p))
    if (userData && !userData.role && !exempt) {
      navigate("/onboarding", { replace: true })
    }
  }, [userData, location.pathname, navigate])

  useEffect(()=>{
    const getUser = async () => {
      try {
        const result = await axios.get(ServerUrl + "/api/user/current-user", {withCredentials:true})
        dispatch(setUserData(result.data))
      } catch (error) {
        console.log(error)
        dispatch(setUserData(null))
      }
    }
    getUser()

  },[dispatch])
  return (
    <>
    <Toaster position='top-center' />
    <Routes>
      <Route path='/' element={<Home/>}/>
      <Route path='/for-companies' element={<ForCompanies/>}/>
      <Route path='/auth' element={<Auth/>}/>
      <Route path='/onboarding' element={<Onboarding/>}/>
      <Route path='/room/:token' element={<InterviewRoom/>}/>
      <Route path='/profile' element={<Profile/>}/>
      <Route path='/jobs' element={<Jobs/>}/>
      <Route path='/jobs/:id' element={<JobDetail/>}/>

      {/* students */}
      <Route path='/dashboard' element={<RequireRole role='student'><Dashboard/></RequireRole>}/>
      <Route path='/practice' element={<RequireRole role='student' publicOk><Practice/></RequireRole>}/>
      <Route path='/practice/:slug' element={<RequireRole role='student' publicOk><ProblemPage/></RequireRole>}/>
      <Route path='/sheets/:id' element={<RequireRole role='student' publicOk><SheetPage/></RequireRole>}/>
      <Route path='/interview' element={<RequireRole role='student'><InterviewPage/></RequireRole>}/>
      <Route path='/history' element={<RequireRole role='student'><InterviewHistory/></RequireRole>}/>
      <Route path='/pricing' element={<RequireRole role='student' publicOk><Pricing/></RequireRole>}/>
      <Route path='/report/:id' element={<RequireRole role='student'><InterviewReport/></RequireRole>}/>
      <Route path='/applications' element={<RequireRole role='student'><MyApplications/></RequireRole>}/>

      {/* company workspace */}
      <Route path='/invite/:token' element={<AcceptInvite/>}/>
      <Route path='/company' element={<Company><CompanyHome/></Company>}/>
      <Route path='/company/jobs' element={<Company><CompanyJobs/></Company>}/>
      <Route path='/company/jobs/:id' element={<Company><JobPipeline/></Company>}/>
      <Route path='/company/interviews' element={<Company><HiringDashboard/></Company>}/>
      <Route path='/company/interviews/:id' element={<Company><InterviewFeedback/></Company>}/>
      <Route path='/company/candidates' element={<Company><Candidates/></Company>}/>
      <Route path='/company/candidates/:id' element={<Company><CandidateProfile/></Company>}/>
      <Route path='/company/reports' element={<Company><Reports/></Company>}/>
      <Route path='/company/calendar' element={<Company><Calendar/></Company>}/>
      <Route path='/company/team' element={<Company><Team/></Company>}/>
      <Route path='/company/settings' element={<Company><OrgSettings/></Company>}/>
      <Route path='/hiring' element={<Navigate to='/company/interviews' replace/>}/>

      {/* public careers pages, one per workspace */}
      <Route path='/careers/:slug' element={<Careers/>}/>
      <Route path='/careers/:slug/:jobId' element={<CareersJob/>}/>



    </Routes>
    </>
  )
}

export default App
