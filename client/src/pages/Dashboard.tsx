import { useAuth } from '@/_core/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/login" });
  const { data: leads, isLoading } = trpc.leads.list.useQuery(undefined, {
    enabled: !!user && user.role === 'admin',
  });

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-400">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Lead Management</h1>
          <p className="text-gray-400">Track and manage all incoming leads from your website.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin mr-2" />
            <span>Loading leads...</span>
          </div>
        ) : !leads || leads.length === 0 ? (
          <Card className="bg-[#0a0a0a] border-[#1a1a1a]">
            <CardContent className="py-12 text-center text-gray-400">
              No leads yet. They'll appear here when visitors submit the contact form.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {leads.map((lead) => (
              <Card key={lead.id} className="bg-[#0a0a0a] border-[#1a1a1a] hover:border-[#8B7A2E] transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">
                        {lead.firstName} {lead.lastName}
                      </CardTitle>
                      <CardDescription>{lead.email}</CardDescription>
                    </div>
                    <Badge
                      variant={
                        lead.status === 'new'
                          ? 'default'
                          : lead.status === 'contacted'
                            ? 'secondary'
                            : lead.status === 'converted'
                              ? 'outline'
                              : 'destructive'
                      }
                      className={
                        lead.status === 'new'
                          ? 'bg-[#C9A84C] text-[#050505]'
                          : lead.status === 'contacted'
                            ? 'bg-blue-600'
                            : lead.status === 'converted'
                              ? 'border-green-600 text-green-600'
                              : 'border-red-600 text-red-600'
                      }
                    >
                      {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Plan</p>
                      <p className="font-semibold text-[#C9A84C]">{lead.plan}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Submitted</p>
                      <p className="font-semibold">{format(new Date(lead.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                  </div>
                  {lead.message && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Message</p>
                      <p className="text-gray-300 bg-[#1a1a1a] p-3 rounded text-sm">{lead.message}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
