'use client'
import { motion } from 'framer-motion'

import { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '@/store/store'
import { fetchDashboardOverview } from '@/store/slices/dashboardSlice'
import StatsCards from './StatsCards'
import SalesChart from './SalesChart'
import RecentSales from './RecentSales'
import TopProducts from './TopProducts'
import LowStockProducts from './LowStockProducts'
import { StatCardSkeleton } from './StatCardSkeleton'

export default function Dashboard() {
  const dispatch = useDispatch<AppDispatch>()
  const dashboard = useSelector((state: RootState) => state.dashboard)

  const stats = dashboard?.stats
  const salesChartData = dashboard?.salesChartData ?? []
  const recentSales = dashboard?.recentSales ?? []
  const topProducts = dashboard?.topProducts ?? []
  const lowStockProducts = dashboard?.lowStockProducts ?? []
  const loading = dashboard?.loading

  useEffect(() => {
    dispatch(fetchDashboardOverview())
  }, [dispatch])

  if (loading) {
    return (
      <div className="p-4 sm:p-6 flex flex-col gap-6">
        <div className="bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-lg p-6 h-32 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">
      {/* Welcome Section */}
      <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-indigo-600 via-primary-600 to-purple-700 rounded-2xl shadow-lg p-5 sm:p-8 text-white">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-32 -mb-16 w-48 h-48 bg-primary-400 opacity-20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-2 tracking-tight">Welcome back, Admin 👋</h1>
          <p className="text-primary-100 text-base sm:text-lg font-medium max-w-xl">
            You've processed <span className="font-bold text-white">{stats?.totalTransactions ?? 0}</span> orders in total. Keep up the great work!
          </p>

          {/* {lowStockProducts.length > 0 && (
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-sm font-medium shadow-sm">
              <span className="flex w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
              <span>Attention: <span className="font-bold text-white">{lowStockProducts[0]?.name}</span> is running low.</span>
            </div>
          )} */}
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards
        totalSales={stats?.totalSales ?? 0}
        totalProfit={stats?.totalProfit ?? 0}
        todaySales={stats?.todaySales ?? 0}
        totalCustomers={stats?.totalCustomers ?? 0}
        totalProducts={stats?.totalProducts ?? 0}
      />

      {/* Charts and Tables */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <SalesChart data={salesChartData} />
        <RecentSales sales={recentSales} />
      </motion.div>

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <TopProducts products={topProducts} />
        <LowStockProducts products={lowStockProducts} />
      </motion.div>
    </div>
  )
}
