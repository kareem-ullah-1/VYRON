import Layout from "@/components/Layout/Layout";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <Layout>{children}</Layout>;
}
