
import { FileText } from "lucide-react";

export default function TermsAndConditionsPage() {
  const lastUpdatedDate = "July 26, 2024"; // Placeholder date

  return (
    <div className="container mx-auto py-12 px-4 md:px-6">
      <header className="mb-10 text-center">
        <FileText className="w-16 h-16 text-primary mx-auto mb-4" />
        <h1 className="text-4xl md:text-5xl font-extrabold text-primary mb-3 font-headline">
          Terms and Conditions
        </h1>
        <p className="text-sm text-muted-foreground">Last Updated: {lastUpdatedDate}</p>
      </header>

      <article className="prose prose-lg max-w-3xl mx-auto text-foreground/90">
        <p>
          Welcome to Skael! These terms and conditions outline the rules and regulations for the use of Skael's Website and services, accessible via [Your Website URL - e.g., www.skael.com]. By accessing this website and using our services, we assume you accept these terms and conditions. Do not continue to use Skael if you do not agree to all of the terms and conditions stated on this page.
        </p>

        <h2 className="text-2xl font-semibold text-primary mt-8 mb-3">1. Interpretation and Definitions</h2>
        <p>
          <strong>Interpretation:</strong> The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.
        </p>
        <p>
          <strong>Definitions:</strong> For the purposes of these Terms and Conditions:
          <ul>
            <li><strong>"Service"</strong> refers to the Skael application and website.</li>
            <li><strong>"User", "You", "Your"</strong> refers to you, the person log on this website and compliant to the Company’s terms and conditions.</li>
            <li><strong>"Company", "Ourselves", "We", "Our", "Us"</strong> refers to Skael.</li>
            <li><strong>"Content"</strong> refers to text, images, or other information that can be posted, uploaded, linked to or otherwise made available by You, regardless of the form of that content.</li>
          </ul>
          [Add more definitions as necessary...]
        </p>

        <h2 className="text-2xl font-semibold text-primary mt-8 mb-3">2. License to Use Service</h2>
        <p>
          Unless otherwise stated, Skael and/or its licensors own the intellectual property rights for all material on Skael. All intellectual property rights are reserved. You may access this from Skael for your own personal use subjected to restrictions set in these terms and conditions.
        </p>
        <p>
          You must not:
          <ul>
            <li>Republish material from Skael</li>
            <li>Sell, rent or sub-license material from Skael</li>
            <li>Reproduce, duplicate or copy material from Skael</li>
            <li>Redistribute content from Skael</li>
          </ul>
          This Agreement shall begin on the date hereof.
        </p>
         <p>
          [Detailed content about the license to use the service will go here. Ensure it's keyword-rich and provides value to the user. Aim for comprehensive information related to Service Usage, Intellectual Property Rights.]
        </p>


        <h2 className="text-2xl font-semibold text-primary mt-8 mb-3">3. User Accounts</h2>
        <p>
          When You create an account with Us, You must provide Us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of Your account on Our Service.
        </p>
        <p>
          You are responsible for safeguarding the password that You use to access the Service and for any activities or actions under Your password, whether Your password is with Our Service or a third-party service.
        </p>
        <p>
          [Detailed content about user accounts, responsibilities, and security will go here.]
        </p>

        <h2 className="text-2xl font-semibold text-primary mt-8 mb-3">4. Content</h2>
        <p>
          Our Service allows You to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material ("Content"). You are responsible for the Content that You post to the Service, including its legality, reliability, and appropriateness.
        </p>
        <p>
          [Detailed content about user-generated content, rights you grant us, and content restrictions will go here.]
        </p>


        <h2 className="text-2xl font-semibold text-primary mt-8 mb-3">5. Prohibited Uses</h2>
        <p>
          You may use the Service only for lawful purposes and in accordance with Terms. You agree not to use the Service:
          <ul>
            <li>In any way that violates any applicable national or international law or regulation.</li>
            <li>For the purpose of exploiting, harming, or attempting to exploit or harm minors in any way by exposing them to inappropriate content or otherwise.</li>
            <li>To transmit, or procure the sending of, any advertising or promotional material, including any "junk mail", "chain letter," "spam," or any other similar solicitation.</li>
          </ul>
          [Expand on prohibited uses, including system abuse, data scraping, etc.]
        </p>


        <h2 className="text-2xl font-semibold text-primary mt-8 mb-3">6. Intellectual Property</h2>
        <p>
          The Service and its original content (excluding Content provided by You or other users), features and functionality are and will remain the exclusive property of Skael and its licensors. The Service is protected by copyright, trademark, and other laws of both India and foreign countries.
        </p>
        <p>
          [Detailed content about intellectual property rights.]
        </p>

        <h2 className="text-2xl font-semibold text-primary mt-8 mb-3">7. Termination</h2>
        <p>
          We may terminate or suspend Your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if You breach these Terms and Conditions.
        </p>
        <p>
          [Detailed content about termination of accounts and service.]
        </p>

        <h2 className="text-2xl font-semibold text-primary mt-8 mb-3">8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by applicable law, in no event shall Skael or its suppliers be liable for any special, incidental, indirect, or consequential damages whatsoever (including, but not limited to, damages for loss of profits, loss of data or other information, for business interruption, for personal injury, loss of privacy arising out of or in any way related to the use of or inability to use the Service).
        </p>
        <p>
          [Detailed content about limitations of liability.]
        </p>

        <h2 className="text-2xl font-semibold text-primary mt-8 mb-3">9. Governing Law</h2>
        <p>
          The laws of India, excluding its conflicts of law rules, shall govern this Terms and Your use of the Service. Your use of the Application may also be subject to other local, state, national, or international laws.
        </p>
        <p>
          [Detailed content about governing law and dispute resolution.]
        </p>

        <h2 className="text-2xl font-semibold text-primary mt-8 mb-3">10. Changes to These Terms and Conditions</h2>
        <p>
          We reserve the right, at Our sole discretion, to modify or replace these Terms at any time. If a revision is material We will make reasonable efforts to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at Our sole discretion.
        </p>
        <p>
          [Detailed content about how changes to terms will be handled.]
        </p>

        <h2 className="text-2xl font-semibold text-primary mt-8 mb-3">11. Contact Us</h2>
        <p>
          If you have any questions about these Terms and Conditions, You can contact us:
          <ul>
            <li>By email: [Your Contact Email]</li>
            <li>By visiting this page on our website: [Link to Your Contact Page]</li>
          </ul>
        </p>
      </article>
    </div>
  );
}
