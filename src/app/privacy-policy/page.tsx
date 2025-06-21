
import { ShieldCheck } from "lucide-react";

export default function PrivacyPolicyPage() {
  const lastUpdatedDate = "July 26, 2024"; // Placeholder date

  return (
    <div className="container mx-auto py-12 px-4 md:px-6">
      <header className="mb-10 text-center">
        <ShieldCheck className="w-16 h-16 text-primary mx-auto mb-4" />
        <h1 className="text-4xl md:text-5xl font-extrabold text-primary mb-3 font-headline">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground">Last Updated: {lastUpdatedDate}</p>
      </header>

      <article className="prose prose-lg max-w-3xl mx-auto text-foreground/90">
        <p>
          At Skael, accessible from [Your Website URL - e.g., www.skael.com], one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by Skael and how we use it.
        </p>
        <p>
          If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact us.
        </p>
        <p>
          This Privacy Policy applies only to our online activities and is valid for visitors to our website with regards to the information that they shared and/or collect in Skael. This policy is not applicable to any information collected offline or via channels other than this website.
        </p>

        <h2 className="text-2xl font-semibold text-primary mt-8 mb-3">Consent</h2>
        <p>
          By using our website, you hereby consent to our Privacy Policy and agree to its terms.
        </p>

        <h2 className="text-2xl font-semibold text-primary mt-8 mb-3">Information We Collect</h2>
        <p>
          The personal information that you are asked to provide, and the reasons why you are asked to provide it, will be made clear to you at the point we ask you to provide your personal information.
        </p>
        <p>
          If you contact us directly, we may receive additional information about you such as your name, email address, phone number, the contents of the message and/or attachments you may send us, and any other information you may choose to provide.
        </p>
        <p>
          When you register for an Account, we may ask for your contact information, including items such as name, company name, address, email address, and telephone number.
        </p>
        <p>
          [Detailed content about the types of information collected (e.g., personal identification, resume data, usage data) will go here. Be specific and transparent.]
        </p>

        <h2 className="text-2xl font-semibold text-primary mt-8 mb-3">How We Use Your Information</h2>
        <p>
          We use the information we collect in various ways, including to:
        </p>
        <ul>
          <li>Provide, operate, and maintain our website and services</li>
          <li>Improve, personalize, and expand our website and services</li>
          <li>Understand and analyze how you use our website and services</li>
          <li>Develop new products, services, features, and functionality</li>
          <li>Communicate with you, either directly or through one of our partners, including for customer service, to provide you with updates and other information relating to the website, and for marketing and promotional purposes</li>
          <li>Send you emails</li>
          <li>Find and prevent fraud</li>
        </ul>
        <p>
          [Detailed content about how user information is used. For an AI job app, this would include job matching, resume generation, etc. Mention data processing for AI features.]
        </p>

        <h2 className="text-2xl font-semibold text-primary mt-8 mb-3">Log Files</h2>
        <p>
          Skael follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting companies do this and a part of hosting services' analytics. The information collected by log files include internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is personally identifiable. The purpose of the information is for analyzing trends, administering the site, tracking users' movement on the website, and gathering demographic information.
        </p>

        <h2 className="text-2xl font-semibold text-primary mt-8 mb-3">Cookies and Web Beacons</h2>
        <p>
          Like any other website, Skael uses 'cookies'. These cookies are used to store information including visitors' preferences, and the pages on the website that the visitor accessed or visited. The information is used to optimize the users' experience by customizing our web page content based on visitors' browser type and/or other information.
        </p>
        <p>
          [Detailed content about cookie usage, types of cookies, and user choices regarding cookies.]
        </p>

        <h2 className="text-2xl font-semibold text-primary mt-8 mb-3">Third-Party Privacy Policies</h2>
        <p>
          Skael's Privacy Policy does not apply to other advertisers or websites. Thus, we are advising you to consult the respective Privacy Policies of these third-party ad servers for more detailed information. It may include their practices and instructions about how to opt-out of certain options.
        </p>
        <p>
          [Mention any key third-party services used, e.g., analytics, AI model providers if they process PII, payment processors, and link to their privacy policies if possible/relevant.]
        </p>

        <h2 className="text-2xl font-semibold text-primary mt-8 mb-3">Data Security</h2>
        <p>
          The security of Your Personal Data is important to Us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While We strive to use commercially acceptable means to protect Your Personal Data, We cannot guarantee its absolute security.
        </p>
        <p>
          [Detailed content about data security measures implemented (encryption, access controls, etc.).]
        </p>

        <h2 className="text-2xl font-semibold text-primary mt-8 mb-3">Your Data Protection Rights (e.g., GDPR, CCPA)</h2>
        <p>
          Depending on your location, you may have certain data protection rights. We aim to take reasonable steps to allow you to correct, amend, delete, or limit the use of your Personal Data.
        </p>
        <p>
          If you wish to be informed what Personal Data we hold about you and if you want it to be removed from our systems, please contact us.
        </p>
        <p>
          [Provide more specific details based on applicable regulations like GDPR (Right to access, rectification, erasure, restrict processing, data portability, object) and CCPA (Right to know, delete, opt-out of sale). This section is crucial for SEO and compliance.]
        </p>

        <h2 className="text-2xl font-semibold text-primary mt-8 mb-3">Children's Information</h2>
        <p>
          Another part of our priority is adding protection for children while using the internet. We encourage parents and guardians to observe, participate in, and/or monitor and guide their online activity.
        </p>
        <p>
          Skael does not knowingly collect any Personal Identifiable Information from children under the age of 13 (or applicable age in jurisdiction). If you think that your child provided this kind of information on our website, we strongly encourage you to contact us immediately and we will do our best efforts to promptly remove such information from our records.
        </p>

        <h2 className="text-2xl font-semibold text-primary mt-8 mb-3">Changes to This Privacy Policy</h2>
        <p>
          We may update Our Privacy Policy from time to time. We will notify You of any changes by posting the new Privacy Policy on this page.
        </p>
        <p>
          We will let You know via email and/or a prominent notice on Our Service, prior to the change becoming effective and update the "Last updated" date at the top of this Privacy Policy.
        </p>
        <p>
          You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
        </p>

        <h2 className="text-2xl font-semibold text-primary mt-8 mb-3">Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, You can contact us:
        </p>
        <ul>
          <li>By email: [Your Contact Email]</li>
          <li>By visiting this page on our website: [Link to Your Contact Page]</li>
        </ul>
      </article>
    </div>
  );
}
