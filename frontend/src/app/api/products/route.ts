import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const dataPath = path.join(process.cwd(), 'data', 'products.json')

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const lowStock = searchParams.get('lowStock')

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
    let filteredData = [...data]

    // Filter by category
    if (category) {
      filteredData = filteredData.filter(product => product.category === category)
    }

    // Search by name or SKU
    if (search) {
      const searchLower = search.toLowerCase()
      filteredData = filteredData.filter(product => 
        product.name.toLowerCase().includes(searchLower) ||
        product.sku.toLowerCase().includes(searchLower) ||
        product.barcode.includes(search)
      )
    }

    // Filter low stock items
    if (lowStock === 'true') {
      filteredData = filteredData.filter(product => product.stock <= product.lowStockThreshold)
    }

    return NextResponse.json({
      success: true,
      data: filteredData,
      total: filteredData.length
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const newProduct = await request.json()
    
    // Generate new ID
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
    const newId = (Math.max(...data.map((p: any) => parseInt(p.id))) + 1).toString()
    
    const product = {
      id: newId,
      ...newProduct,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    data.push(product)
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2))

    return NextResponse.json({
      success: true,
      data: product
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
