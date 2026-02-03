import { MainLayout } from '@/components/layout/MainLayout';
import { useI18n } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Upload, 
  Scan, 
  Users, 
  FileText,
  HelpCircle,
  ChevronRight
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function Guide() {
  const { t, language } = useI18n();

  const sections = [
    {
      id: 'getting-started',
      icon: <ChevronRight className="h-5 w-5" />,
      title: language === 'tr' ? 'Başlarken' : 'Getting Started',
      content: language === 'tr' 
        ? `1. Hesap oluşturun veya giriş yapın
2. "Diş Hekimi" rolünü seçin
3. Dashboard'a yönlendirileceksiniz
4. Hasta ekleyerek başlayabilirsiniz`
        : `1. Create an account or log in
2. Select the "Dentist" role
3. You will be redirected to the Dashboard
4. You can start by adding patients`
    },
    {
      id: 'patients',
      icon: <Users className="h-5 w-5" />,
      title: language === 'tr' ? 'Hasta Yönetimi' : 'Patient Management',
      content: language === 'tr'
        ? `• Hastalar sayfasından yeni hasta ekleyebilirsiniz
• Hasta adı, soyadı, kimlik numarası ve iletişim bilgilerini girin
• Hasta detay sayfasından röntgen yükleyebilirsiniz
• Her hasta için birden fazla röntgen kaydedebilirsiniz`
        : `• You can add new patients from the Patients page
• Enter patient name, ID number and contact information
• You can upload radiographs from the patient detail page
• You can save multiple radiographs for each patient`
    },
    {
      id: 'upload',
      icon: <Upload className="h-5 w-5" />,
      title: language === 'tr' ? 'Röntgen Yükleme' : 'Uploading Radiographs',
      content: language === 'tr'
        ? `• Hasta detay sayfasında "Röntgen Yükle" butonuna tıklayın
• Görüntüyü sürükleyip bırakın veya dosya seçin
• Desteklenen formatlar: JPG, PNG, WEBP
• Maksimum dosya boyutu: 10MB
• Yükleme tamamlandığında analiz otomatik başlar`
        : `• Click "Upload Radiograph" on the patient detail page
• Drag and drop the image or select a file
• Supported formats: JPG, PNG, WEBP
• Maximum file size: 10MB
• Analysis starts automatically after upload`
    },
    {
      id: 'analysis',
      icon: <Scan className="h-5 w-5" />,
      title: language === 'tr' ? 'Görüntü Analizi' : 'Image Analysis',
      content: language === 'tr'
        ? `• Yapay zeka modeli röntgeni analiz eder
• Dişler ve hastalıklar tespit edilir
• Sonuçlar tablo halinde gösterilir
• Diş maskelerini ve hastalık maskelerini açıp kapatabilirsiniz
• Raporu PDF olarak indirebilirsiniz`
        : `• AI model analyzes the radiograph
• Teeth and diseases are detected
• Results are shown in a table
• You can toggle teeth masks and disease masks
• You can download the report as PDF`
    },
    {
      id: 'reports',
      icon: <FileText className="h-5 w-5" />,
      title: language === 'tr' ? 'Raporlar' : 'Reports',
      content: language === 'tr'
        ? `• Her analiz için detaylı rapor oluşturulur
• Raporda tespit edilen rahatsızlıklar listelenir
• İlgili diş numaraları belirtilir
• Güven oranı ve şiddet derecesi gösterilir
• Raporu yazdırabilir veya PDF olarak indirebilirsiniz`
        : `• Detailed report is generated for each analysis
• Detected conditions are listed in the report
• Related tooth numbers are specified
• Confidence rate and severity are shown
• You can print or download the report as PDF`
    }
  ];

  const faqs = [
    {
      q: language === 'tr' ? 'Hangi röntgen türleri destekleniyor?' : 'What radiograph types are supported?',
      a: language === 'tr' 
        ? 'Şu anda panoramik (OPG) röntgenler desteklenmektedir. Periapikal ve bitewing desteği yakında eklenecektir.'
        : 'Currently panoramic (OPG) radiographs are supported. Periapical and bitewing support will be added soon.'
    },
    {
      q: language === 'tr' ? 'Analiz sonuçları ne kadar güvenilir?' : 'How reliable are the analysis results?',
      a: language === 'tr'
        ? 'Yapay zeka modeli yüksek doğruluk oranına sahiptir ancak sonuçlar sadece karar destek amaçlıdır. Kesin teşhis için klinik değerlendirme gereklidir.'
        : 'The AI model has high accuracy but results are for decision support only. Clinical evaluation is required for definitive diagnosis.'
    },
    {
      q: language === 'tr' ? 'Verilerim güvende mi?' : 'Is my data secure?',
      a: language === 'tr'
        ? 'Evet, tüm veriler şifrelenerek saklanır. KVKK, GDPR ve HIPAA uyumluluğu sağlanmaktadır.'
        : 'Yes, all data is stored encrypted. KVKK, GDPR and HIPAA compliance is maintained.'
    },
    {
      q: language === 'tr' ? 'Ücretsiz mi?' : 'Is it free?',
      a: language === 'tr'
        ? 'Evet, temel özellikler ücretsizdir. Gelişmiş özellikler için destekleme paketi satın alabilirsiniz.'
        : 'Yes, basic features are free. You can purchase a support package for advanced features.'
    }
  ];

  return (
    <MainLayout>
      <div className="container py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">{t.guide.title}</h1>

        {/* Sections */}
        <div className="space-y-4 mb-12">
          {sections.map(section => (
            <Card key={section.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {section.icon}
                  </div>
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-line">{section.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              {t.guide.sections.faq}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`faq-${index}`}>
                  <AccordionTrigger>{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
