import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Activity, Loader2, Plus, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ThinkingAnimation from '@/components/ThinkingAnimation';

const SymptomCheckerPage = () => {
  const { t } = useTranslation();
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [currentSymptom, setCurrentSymptom] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [duration, setDuration] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const analysisRef = useRef<HTMLDivElement>(null);

  const addSymptom = () => {
    if (currentSymptom.trim() && !symptoms.includes(currentSymptom.trim())) {
      setSymptoms([...symptoms, currentSymptom.trim()]);
      setCurrentSymptom('');
      setIsDirty(true);
    }
  };

  const removeSymptom = (symptom: string) => {
    setSymptoms(symptoms.filter(s => s !== symptom));
    setIsDirty(true);
  };

  const analyzeSymptoms = async () => {
    if (symptoms.length === 0) {
      toast.error('Please add at least one symptom');
      return;
    }

    setIsAnalyzing(true);
    setAnalysis('');
    setIsDirty(false);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-symptoms', {
        body: { symptoms, age, gender, duration }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setAnalysis(data.analysis);
    } catch (error) {
      console.error('Error analyzing symptoms:', error);
      toast.error('Failed to analyze symptoms. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleInputChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setIsDirty(true);
  };

  const handleSelectChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setIsDirty(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSymptom();
    }
  };

  useEffect(() => {
    if (analysis && analysisRef.current) {
      analysisRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [analysis]);

  return (
    <div className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <Activity className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h1 className="text-3xl md:text-4xl font-bold mb-4">AI Symptom Checker</h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Get preliminary health insights based on your symptoms. Our AI assistant will guide you on the next steps.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Information</CardTitle>
                  <CardDescription>Help us provide better analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="Enter your age"
                      value={age}
                      onChange={handleInputChange(setAge)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={gender} onValueChange={handleSelectChange(setGender)}>
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">How long have you had these symptoms?</Label>
                    <Input
                      id="duration"
                      placeholder="e.g., 3 days, 2 weeks"
                      value={duration}
                      onChange={handleInputChange(setDuration)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Add Your Symptoms</CardTitle>
                  <CardDescription>List all symptoms you're experiencing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="symptom">Symptom</Label>
                    <div className="flex gap-2">
                      <Input
                        id="symptom"
                        placeholder="e.g., knee pain, headache"
                        value={currentSymptom}
                        onChange={handleInputChange(setCurrentSymptom)}
                        onKeyPress={handleKeyPress}
                      />
                      <Button onClick={addSymptom} size="icon">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 min-h-[100px] p-3 border rounded-md bg-muted/50">
                    {symptoms.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No symptoms added yet</p>
                    ) : (
                      symptoms.map((symptom) => (
                        <Badge key={symptom} variant="secondary" className="gap-1">
                          {symptom}
                          <button
                            onClick={() => removeSymptom(symptom)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-center mb-6">
              {isDirty && (
                <Button
                  size="lg"
                  onClick={analyzeSymptoms}
                  disabled={isAnalyzing || symptoms.length === 0}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Symptoms'
                  )}
                </Button>
              )}
            </div>

            {isAnalyzing && <ThinkingAnimation />}

            {analysis && (
              <div ref={analysisRef}>
                <Card>
                  <CardHeader>
                    <CardTitle>Preliminary Analysis</CardTitle>
                    <CardDescription>Based on the symptoms you provided</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="prose dark:prose-invert max-w-none">
                      <ReactMarkdown>{analysis}</ReactMarkdown>
                    </div>
                    <div className="mt-6 pt-6 border-t">
                      <p className="text-sm font-semibold mb-2">Ready to consult with a doctor?</p>
                      <Button asChild>
                        <a href="/appointment">Book an Appointment</a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Card className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                      <div>
                        <CardTitle className="text-orange-900 dark:text-orange-100">Important Disclaimer</CardTitle>
                        <CardDescription className="text-orange-800 dark:text-orange-200">
                          This tool provides preliminary information only and is NOT a substitute for professional medical advice, diagnosis, or treatment. 
                          Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </div>
            )}
          </div>
        </main>

        <Footer />
    </div>
  );
};

export default SymptomCheckerPage;
