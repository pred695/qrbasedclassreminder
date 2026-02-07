import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, MessageSquare, Save, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import Button from '@components/shared/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@components/shared/Card';
import Spinner from '@components/shared/Spinner';
import Alert, { AlertDescription } from '@components/shared/Alert';
import { CLASS_TYPE_LABELS } from '@utils/constants';
import { getAllTemplates, saveTemplate } from '@services/templateService';
import toast from 'react-hot-toast';

const TemplateManager = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTypes, setExpandedTypes] = useState({});
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state for editing
  const [formData, setFormData] = useState({
    subject: '',
    body: '',
  });

  const fetchTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllTemplates();
      setTemplates(data);
    } catch (err) {
      setError(err.message || 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const getTemplateForClassType = (classType, channel) => {
    return templates.find(t => t.classType === classType && t.channel === channel);
  };

  const getDefaultTemplate = (classType, channel) => {
    const className = CLASS_TYPE_LABELS[classType] || classType;
    if (channel === 'EMAIL') {
      return {
        subject: `Reminder: ${className} Training Renewal`,
        body: `Hello,\n\nThis is a reminder that your ${className} training certification is approaching its renewal period.\n\nPlease schedule your next session at your earliest convenience.\n\nVisit: {{scheduleLink}}\n\nIf you no longer wish to receive these reminders, you can update your preferences: {{optOutLink}}\n\nThank you,\nStudent Training Portal`,
      };
    }
    return {
      body: `Reminder: Your ${className} certification is due for renewal. Visit {{scheduleLink}} to schedule.`,
    };
  };

  const toggleExpand = (classType) => {
    setExpandedTypes(prev => ({
      ...prev,
      [classType]: !prev[classType],
    }));
  };

  const startEditing = (classType, channel) => {
    const existing = getTemplateForClassType(classType, channel);
    const defaultTemplate = getDefaultTemplate(classType, channel);

    setFormData({
      subject: existing?.subject || defaultTemplate.subject || '',
      body: existing?.body || defaultTemplate.body,
    });
    setEditingTemplate({ classType, channel });
  };

  const cancelEditing = () => {
    setEditingTemplate(null);
    setFormData({ subject: '', body: '' });
  };

  const handleSave = async () => {
    if (!editingTemplate) return;

    setIsSaving(true);
    try {
      await saveTemplate(editingTemplate.classType, editingTemplate.channel, formData);
      toast.success('Template saved successfully!');
      await fetchTemplates();
      cancelEditing();
    } catch (err) {
      toast.error(err.message || 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Message Templates
            </h1>
            <p className="text-sm text-muted-foreground">
              View and edit reminder messages for each training type
            </p>
          </div>
          <Button variant="outline" onClick={fetchTemplates} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Template Variables Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Available Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 text-xs">
              <code className="rounded bg-muted px-2 py-1">{'{{classTypeName}}'}</code>
              <code className="rounded bg-muted px-2 py-1">{'{{scheduleLink}}'}</code>
              <code className="rounded bg-muted px-2 py-1">{'{{optOutLink}}'}</code>
              <code className="rounded bg-muted px-2 py-1">{'{{studentEmail}}'}</code>
              <code className="rounded bg-muted px-2 py-1">{'{{studentPhone}}'}</code>
            </div>
          </CardContent>
        </Card>

        {/* Template Cards by Class Type */}
        <div className="space-y-4">
          {Object.entries(CLASS_TYPE_LABELS).map(([classType, label]) => {
            const emailTemplate = getTemplateForClassType(classType, 'EMAIL');
            const smsTemplate = getTemplateForClassType(classType, 'SMS');
            const isExpanded = expandedTypes[classType];

            return (
              <Card key={classType}>
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => toggleExpand(classType)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{label}</CardTitle>
                    <div className="flex items-center gap-4">
                      <div className="flex gap-2 text-xs">
                        <span className={`flex items-center gap-1 ${emailTemplate ? 'text-green-500' : 'text-muted-foreground'}`}>
                          <Mail className="h-3 w-3" />
                          {emailTemplate ? 'Configured' : 'Default'}
                        </span>
                        <span className={`flex items-center gap-1 ${smsTemplate ? 'text-green-500' : 'text-muted-foreground'}`}>
                          <MessageSquare className="h-3 w-3" />
                          {smsTemplate ? 'Configured' : 'Default'}
                        </span>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-4 pt-0">
                    {/* Email Template */}
                    <div className="rounded-lg border border-border p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-blue-500" />
                          <span className="font-medium text-sm">Email Template</span>
                        </div>
                        {editingTemplate?.classType === classType && editingTemplate?.channel === 'EMAIL' ? (
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={cancelEditing} disabled={isSaving}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={isSaving}>
                              <Save className="mr-1 h-3 w-3" />
                              {isSaving ? 'Saving...' : 'Save'}
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => startEditing(classType, 'EMAIL')}>
                            Edit
                          </Button>
                        )}
                      </div>

                      {editingTemplate?.classType === classType && editingTemplate?.channel === 'EMAIL' ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Subject</label>
                            <input
                              type="text"
                              value={formData.subject}
                              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                              placeholder="Email subject line"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Body</label>
                            <textarea
                              value={formData.body}
                              onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                              rows={6}
                              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground font-mono"
                              placeholder="Email body content"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-xs text-muted-foreground">Subject: </span>
                            <span className="text-foreground">
                              {emailTemplate?.subject || getDefaultTemplate(classType, 'EMAIL').subject}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Body:</span>
                            <pre className="mt-1 whitespace-pre-wrap rounded bg-muted p-3 text-xs text-foreground">
                              {emailTemplate?.body || getDefaultTemplate(classType, 'EMAIL').body}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SMS Template */}
                    <div className="rounded-lg border border-border p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-green-500" />
                          <span className="font-medium text-sm">SMS Template</span>
                        </div>
                        {editingTemplate?.classType === classType && editingTemplate?.channel === 'SMS' ? (
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={cancelEditing} disabled={isSaving}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={isSaving}>
                              <Save className="mr-1 h-3 w-3" />
                              {isSaving ? 'Saving...' : 'Save'}
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => startEditing(classType, 'SMS')}>
                            Edit
                          </Button>
                        )}
                      </div>

                      {editingTemplate?.classType === classType && editingTemplate?.channel === 'SMS' ? (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Message (max 160 chars recommended)</label>
                          <textarea
                            value={formData.body}
                            onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                            rows={3}
                            maxLength={320}
                            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground font-mono"
                            placeholder="SMS message"
                          />
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formData.body.length}/320 characters
                          </p>
                        </div>
                      ) : (
                        <pre className="whitespace-pre-wrap rounded bg-muted p-3 text-xs text-foreground">
                          {smsTemplate?.body || getDefaultTemplate(classType, 'SMS').body}
                        </pre>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TemplateManager;
