import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const dataPath = path.join(process.cwd(), 'data', 'products.json')

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
    const product = data.find((p: any) => p.id === params.id)

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: product
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updatedProduct = await request.json()
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
    
    const index = data.findIndex((p: any) => p.id === params.id)
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    data[index] = {
      ...data[index],
      ...updatedProduct,
      updatedAt: new Date().toISOString()
    }

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2))

    return NextResponse.json({
      success: true,
      data: data[index]
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
    const filteredData = data.filter((p: any) => p.id !== params.id)

    if (filteredData.length === data.length) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    fs.writeFileSync(dataPath, JSON.stringify(filteredData, null, 2))

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
