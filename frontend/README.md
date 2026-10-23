# VYRON - Modern Point of Sale System

A comprehensive POS system built with Next.js 14, TypeScript, Tailwind CSS, and Redux Toolkit.

## 🚀 Features

### Core POS Functionality
- **Point of Sale Interface**: Modern, intuitive sales interface with product search and cart management
- **Product Management**: Complete inventory management with categories, stock tracking, and low stock alerts
- **Customer Management**: Customer database with contact information and purchase history
- **Sales Analytics**: Comprehensive dashboard with charts, reports, and key metrics
- **User Management**: Role-based access control (Admin, Manager, Cashier)

### Advanced Features
- **Real-time Dashboard**: Live sales metrics, top products, and low stock alerts
- **Responsive Design**: Mobile-friendly interface that works on all devices
- **State Management**: Redux Toolkit for efficient state management
- **Modern UI**: Clean, professional interface with Tailwind CSS
- **Settings Management**: Comprehensive system configuration options

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **UI Components**: Headless UI, Heroicons
- **Charts**: Recharts
- **Date Handling**: date-fns

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pos-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Dashboard
│   ├── pos/               # POS interface
│   ├── products/          # Product management
│   ├── customers/         # Customer management
│   ├── sales/            # Sales management
│   └── settings/          # System settings
├── components/            # React components
│   ├── Layout/           # Layout components
│   ├── Dashboard/        # Dashboard components
│   ├── POS/             # POS interface components
│   ├── Products/        # Product management components
│   ├── Customers/       # Customer management components
│   ├── Sales/           # Sales management components
│   └── Settings/        # Settings components
├── store/                # Redux store and slices
│   ├── store.ts         # Store configuration
│   └── slices/          # Redux slices
└── types/               # TypeScript type definitions
```

## 🎯 Key Components

### Dashboard
- Sales analytics with interactive charts
- Key performance indicators
- Recent sales transactions
- Top-selling products
- Low stock alerts

### POS Interface
- Product grid with search and filtering
- Shopping cart with quantity management
- Customer selection
- Payment processing
- Receipt generation

### Product Management
- Product catalog with categories
- Add/edit/delete products
- Stock management
- Low stock alerts
- Barcode support

### Customer Management
- Customer database
- Contact information
- Purchase history
- Customer analytics

### Sales Management
- Sales history
- Transaction details
- Sales reports
- Payment tracking

### Settings
- General system settings
- User management
- Notification preferences
- Security settings

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_APP_NAME=VYRON
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### Tailwind Configuration
The project uses a custom Tailwind configuration with:
- Primary color scheme
- Custom component classes
- Responsive design utilities

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones
- Touch devices

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy automatically

### Other Platforms
The application can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Railway
- DigitalOcean App Platform

## 🎨 Customization

### Colors
Update the color scheme in `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        // Your custom primary colors
      }
    }
  }
}
```

### Components
All components are modular and can be easily customized or extended.

## 📊 Data Management

The application uses Redux Toolkit for state management with the following slices:
- `authSlice`: User authentication and roles
- `cartSlice`: Shopping cart management
- `productsSlice`: Product catalog and inventory
- `customersSlice`: Customer database
- `salesSlice`: Sales transactions and analytics

## 🔒 Security Features

- Role-based access control
- User authentication
- Session management
- Input validation
- XSS protection

## 📈 Performance

- Server-side rendering with Next.js
- Optimized bundle size
- Lazy loading
- Image optimization
- Caching strategies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the code comments

## 🔮 Future Enhancements

- [ ] Barcode/QR code scanning
- [ ] Receipt printing
- [ ] Multi-store support
- [ ] Advanced reporting
- [ ] API integration
- [ ] Mobile app
- [ ] Offline support
- [ ] Advanced analytics

---

Built with ❤️ using Next.js, TypeScript, and Tailwind CSS