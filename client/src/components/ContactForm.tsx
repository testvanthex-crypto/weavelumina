import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import type { TRPCClientErrorLike } from '@trpc/client';

interface ContactFormProps {
  selectedPlan?: string | null;
  onSuccess?: () => void;
}

export default function ContactForm({ selectedPlan, onSuccess }: ContactFormProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    plan: selectedPlan || '',
    message: '',
  });

  const createLeadMutation = trpc.leads.create.useMutation({
    onSuccess: () => {
      toast.success('Message sent! We\'ll reply within 24 hours.');
      setFormData({ firstName: '', lastName: '', email: '', plan: selectedPlan || '', message: '' });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to send message. Please try again.');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlanChange = (value: string) => {
    setFormData((prev) => ({ ...prev, plan: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.email || !formData.plan) {
      toast.error('Please fill in all required fields.');
      return;
    }

    createLeadMutation.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      plan: formData.plan,
      message: formData.message,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          name="firstName"
          placeholder="First Name"
          value={formData.firstName}
          onChange={handleChange}
          className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder-gray-600"
          required
        />
        <Input
          name="lastName"
          placeholder="Last Name"
          value={formData.lastName}
          onChange={handleChange}
          className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder-gray-600"
        />
      </div>

      <Input
        name="email"
        type="email"
        placeholder="Email Address"
        value={formData.email}
        onChange={handleChange}
        className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder-gray-600"
        required
      />

      <Select value={formData.plan} onValueChange={handlePlanChange}>
        <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
          <SelectValue placeholder="Select a plan" />
        </SelectTrigger>
        <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
          <SelectItem value="Spark Starter">Spark Starter — $99</SelectItem>
          <SelectItem value="Growth Accelerator">Growth Accelerator — $199</SelectItem>
          <SelectItem value="Boost Builder">Boost Builder — $249</SelectItem>
          <SelectItem value="Custom Project">Custom Project</SelectItem>
        </SelectContent>
      </Select>

      <Textarea
        name="message"
        placeholder="Tell us about your project..."
        value={formData.message}
        onChange={handleChange}
        className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder-gray-600 min-h-24"
      />

      <Button
        type="submit"
        disabled={createLeadMutation.isPending}
        className="w-full bg-[#C9A84C] text-[#050505] hover:bg-[#D4B85C] font-semibold"
      >
        {createLeadMutation.isPending ? 'Sending...' : 'SEND MESSAGE'}
      </Button>
    </form>
  );
}
