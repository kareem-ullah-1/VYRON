'use client'

import { LowStockProduct } from '@/store/slices/dashboardSlice'

interface LowStockProductsProps {
  products: LowStockProduct[]
}

export default function LowStockProducts({ products }: LowStockProductsProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900 tracking-tight">Low Stock Products</h3>
        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          View All
        </button>
      </div>

      <div className="space-y-4">
        {products.length > 0 ? (
          products.slice(0, 5).map((product) => (
            <div key={product.id} className="flex items-center justify-between p-3 bg-red-50/50 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-red-200 rounded-xl flex items-center justify-center shadow-sm border border-red-200/50">
                  <span className="text-red-700 font-bold text-sm">
                    {product.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-500">Code: {product.productCode}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-red-600 mb-1">{product.stock} left</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700">
                  Low Stock
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No low stock products</p>
          </div>
        )}
      </div>
    </div>
  )
}
