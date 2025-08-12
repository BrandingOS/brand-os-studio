import { Container } from '@/shared/ui/Container';
import { Card } from '@/shared/ui/Card';

export default function AccountSettingsPage() {
  return (
    <Container className="py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Account Settings</h1>
        
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
          <p className="text-muted-foreground">Account settings placeholder</p>
        </Card>
      </div>
    </Container>
  );
}