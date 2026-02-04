import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, Info, Terminal } from 'lucide-react';
import { toast } from 'sonner';

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Kod kopyalandı!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

const curlExamples = {
  linux: {
    submit: `curl -X POST https://api.diagnosethat.net/v1/submit-analysis \\
  -H "X-API-Key: dt_xxx...xxxx" \\
  -F "image=@./goruntu.jpg" \\
  -F "patient_ref=P001" \\
  -F "doctor_ref=D001" \\
  -F "clinic_ref=C001"`,
    result: `curl -X GET "https://api.diagnosethat.net/v1/get-result?job_id=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \\
  -H "X-API-Key: dt_xxx...xxxx"`,
  },
  cmd: {
    submit: `curl -X POST https://api.diagnosethat.net/v1/submit-analysis -H "X-API-Key: dt_xxx...xxxx" -F "image=@\\"C:\\goruntu.jpg\\"" -F "patient_ref=P001" -F "doctor_ref=D001" -F "clinic_ref=C001"`,
    result: `curl -X GET "https://api.diagnosethat.net/v1/get-result?job_id=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" -H "X-API-Key: dt_xxx...xxxx"`,
  },
  powershell: {
    submit: `curl.exe -X POST https://api.diagnosethat.net/v1/submit-analysis -H "X-API-Key: dt_xxx...xxxx" -F "image=@C:\\goruntu.jpg" -F "patient_ref=P001" -F "doctor_ref=D001" -F "clinic_ref=C001"`,
    result: `curl.exe -X GET "https://api.diagnosethat.net/v1/get-result?job_id=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" -H "X-API-Key: dt_xxx...xxxx"`,
  },
};

const responseExample = `{
  "success": true,
  "data": {
    "job_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "status": "completed",
    "radiograph_type": "panoramic",
    "inference_version": "1.0.1",
    "result": {
      "teeth": [
        { "tooth_id": 36, "confidence": 0.92, "polygon": [[x1,y1], [x2,y2], ...] }
      ],
      "diseases": [
        { "type": "caries", "confidence": 0.88, "tooth_id": 36, "polygon": [[x1,y1], ...] }
      ]
    }
  }
}`;

const diseaseTypes = [
  { code: 'caries', description: 'Çürük' },
  { code: 'periapical_lesion', description: 'Periapikal lezyon' },
  { code: 'periodontal_bone_loss', description: 'Periodontal kemik kaybı' },
  { code: 'impacted_tooth', description: 'Gömülü diş' },
  { code: 'root_canal_treatment', description: 'Kanal tedavisi' },
  { code: 'crown', description: 'Kron' },
  { code: 'bridge', description: 'Köprü' },
  { code: 'implant', description: 'İmplant' },
  { code: 'filling', description: 'Dolgu' },
  { code: 'missing_tooth', description: 'Eksik diş' },
];

const formFields = [
  { field: 'image', type: 'File', required: 'Evet', description: 'Analiz edilecek radyografi görüntüsü (JPEG, PNG)' },
  { field: 'patient_ref', type: 'String', required: 'Hayır', description: 'Hasta referans numarası (kendi sisteminizden)' },
  { field: 'doctor_ref', type: 'String', required: 'Hayır', description: 'Doktor referans numarası' },
  { field: 'clinic_ref', type: 'String', required: 'Hayır', description: 'Klinik referans numarası' },
];

export default function UsageGuide() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kullanım Kılavuzu</h1>
        <p className="text-muted-foreground mt-2">
          DiagnoseThat API'yi kullanarak dental radyografi analizi yapın
        </p>
      </div>

      {/* API Endpoint */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            API Endpoint
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-3 rounded-lg font-mono text-sm">
            https://api.diagnosethat.net
          </div>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Tüm isteklerde <code className="bg-muted px-1 rounded">X-API-Key</code> header'ı ile API anahtarınızı göndermeniz gerekmektedir.
              API anahtarınızı "API Anahtarları" sayfasından alabilirsiniz.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Analiz Gönderme */}
      <Card>
        <CardHeader>
          <CardTitle>1. Analiz Gönderme</CardTitle>
          <CardDescription>
            POST /v1/submit-analysis - Radyografi görüntüsü göndererek analiz başlatın
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Form Alanları</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alan</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Zorunlu</TableHead>
                  <TableHead>Açıklama</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formFields.map((field) => (
                  <TableRow key={field.field}>
                    <TableCell className="font-mono">{field.field}</TableCell>
                    <TableCell>{field.type}</TableCell>
                    <TableCell>{field.required}</TableCell>
                    <TableCell>{field.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div>
            <h4 className="font-medium mb-2">cURL Örnekleri</h4>
            <Tabs defaultValue="linux">
              <TabsList>
                <TabsTrigger value="linux">Linux / macOS</TabsTrigger>
                <TabsTrigger value="cmd">Windows CMD</TabsTrigger>
                <TabsTrigger value="powershell">Windows PowerShell</TabsTrigger>
              </TabsList>
              <TabsContent value="linux" className="mt-2">
                <CodeBlock code={curlExamples.linux.submit} language="bash" />
              </TabsContent>
              <TabsContent value="cmd" className="mt-2">
                <CodeBlock code={curlExamples.cmd.submit} language="cmd" />
              </TabsContent>
              <TabsContent value="powershell" className="mt-2">
                <CodeBlock code={curlExamples.powershell.submit} language="powershell" />
              </TabsContent>
            </Tabs>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Başarılı bir istek sonucunda <code className="bg-muted px-1 rounded">job_id</code> döner.
              Bu ID'yi sonuç sorgulamak için kullanın.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Sonuç Sorgulama */}
      <Card>
        <CardHeader>
          <CardTitle>2. Sonuç Sorgulama</CardTitle>
          <CardDescription>
            GET /v1/get-result - Job ID ile analiz sonucunu sorgulayın
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">cURL Örnekleri</h4>
            <Tabs defaultValue="linux">
              <TabsList>
                <TabsTrigger value="linux">Linux / macOS</TabsTrigger>
                <TabsTrigger value="cmd">Windows CMD</TabsTrigger>
                <TabsTrigger value="powershell">Windows PowerShell</TabsTrigger>
              </TabsList>
              <TabsContent value="linux" className="mt-2">
                <CodeBlock code={curlExamples.linux.result} language="bash" />
              </TabsContent>
              <TabsContent value="cmd" className="mt-2">
                <CodeBlock code={curlExamples.cmd.result} language="cmd" />
              </TabsContent>
              <TabsContent value="powershell" className="mt-2">
                <CodeBlock code={curlExamples.powershell.result} language="powershell" />
              </TabsContent>
            </Tabs>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Analiz tamamlanana kadar <code className="bg-muted px-1 rounded">status: "pending"</code> veya <code className="bg-muted px-1 rounded">status: "processing"</code> dönebilir.
              Sonuç hazır olduğunda <code className="bg-muted px-1 rounded">status: "completed"</code> döner.
              Polling için 2-3 saniye aralıklarla sorgulama yapmanızı öneririz.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Response Formatı */}
      <Card>
        <CardHeader>
          <CardTitle>Response Formatı</CardTitle>
          <CardDescription>Başarılı bir analiz sonucunda dönen JSON yapısı</CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code={responseExample} language="json" />
        </CardContent>
      </Card>

      {/* Hastalık Tipleri */}
      <Card>
        <CardHeader>
          <CardTitle>Tespit Edilebilen Durumlar</CardTitle>
          <CardDescription>API'nin döndürebileceği bulgular ve açıklamaları</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kod</TableHead>
                <TableHead>Açıklama</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {diseaseTypes.map((disease) => (
                <TableRow key={disease.code}>
                  <TableCell className="font-mono">{disease.code}</TableCell>
                  <TableCell>{disease.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
