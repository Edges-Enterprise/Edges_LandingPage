// supabase/functions/_shared/legal/legalTranslations.ts
//
// Translations for the tenant legal documents.
//
// Structure: each document is an ordered list of sections. English is the
// canonical source and the fallback for every other locale, so a translation
// may be partial - a missing section falls back to English rather than
// rendering blank. The fallback is per *section*, not per document, because a
// section is the unit of legal meaning (a half-English policy is still
// coherent; a half-empty one is not).
//
// Placeholders: {store}, {email}, {country}, {date}, {year}. Interpolation
// happens after lookup, so translations can reorder them freely - which they
// must, since French and Arabic word order differ from English.
//
// ⚠️ STATUS OF THE NON-ENGLISH DRAFTS: fr / es / ar below are complete drafts
// written to validate the mechanism, and are NOT reviewed by a native speaker
// or a lawyer. They are disabled in legalLocales.ts (REVIEWED_LOCALES), so they
// never reach a user. See the note there before enabling one.

import type { LegalLocale } from "./legalLocales";

export type LegalDocId = "privacy" | "terms";

export interface LegalSection {
  /** Stable identifier. Renaming one drops that section back to English. */
  key: string;
  /** Template; may contain {store} {email} {country} {date} {year}. */
  text: string;
}

export type LegalDocument = LegalSection[];

const privacyEn: LegalDocument = [
  { key: "meta", text: "Last Updated: {date}" },
  {
    key: "intro",
    text: "At {store}, your privacy and data protection are of utmost importance to us. This Privacy Policy explains the types of data we collect, how we use it, and your rights regarding your information.\nBy using our app, you acknowledge and consent to the practices described herein.",
  },
  {
    key: "s1",
    text: "1. Consent\nBy accessing or using the {store} mobile application, you agree to this Privacy Policy. If you do not agree with our policies or practices, please do not use the application.",
  },
  {
    key: "s2",
    text: "2. Who We Are\n{store} is a mobile data reselling platform based in {country}. We provide secure, affordable, and fast mobile data services to users across {country}.\n• 📧 Contact Email: {email}",
  },
  {
    key: "s3",
    text: "3. Information We Collect\nWe collect personal and technical information to ensure secure transactions and improve your user experience.\na. Personal Information\n• UserName\n• Phone Number\n• Email Address\nb. Account and Transaction Information\n• Data plan selections and purchase history\n• Payment confirmation and status\n• Wallet or top-up activity\nc. Device and Usage Information\n• Device model and operating system\n• App usage data\n• Crash logs and performance data\nd. Support and Communication\n• When you contact us, we collect message content to resolve your issue effectively.",
  },
  {
    key: "s4",
    text: "4. How We Use Your Information\nYour information is used to:\n• Operate and maintain the {store} app\n• Process and verify mobile data purchases\n• Improve app performance and user experience\n• Prevent fraud and ensure platform security\n• Communicate with you about purchases, updates, or service changes\n• Provide responsive customer support",
  },
  {
    key: "s5",
    text: "5. Payments and Financial Security\nAll payments are processed securely by our banking partners.\n{store} does not store any card or bank details.\nA 10% processing fee applies to all deposits.",
  },
  {
    key: "s6",
    text: "6. Third-Party Integrations\nOur app integrates with:\n• Payment providers - Payment processing\n• Data API providers - For mobile data delivery\nEach service operates under its own privacy policy.",
  },
  {
    key: "s7",
    text: "7. Data Protection Rights\nYou have the right to:\n• Access your personal data\n• Correct inaccurate data\n• Request deletion of your data\n• Restrict how we use your data\n• Object to data processing\n• Transfer your data to another platform\n📩 Contact: {email}",
  },
  {
    key: "s8",
    text: "8. Children's Privacy\nOur services are not intended for children under 13. We do not knowingly collect data from minors.",
  },
  {
    key: "s9",
    text: "9. Updates to This Privacy Policy\nWe may revise this Privacy Policy periodically. You will be notified of major changes.",
  },
  {
    key: "s10",
    text: "10. Contact Us\n{store}\n📧 Email: {email}",
  },
  {
    key: "s11",
    text: "11. How to Request Account Deletion\nYou can ask us to delete your {store} account and its data at any time.\n\nTo request deletion, email {email} from the email address registered to your account, with the subject line \"Account Deletion Request\".\n\nPlease include:\n• The email address or phone number on the account\n• Your username\n• The store name: {store}\n\nWhat we delete:\n• Your profile and login credentials\n• Your wallet balance record\n• Your purchase and transaction history\n• Your saved virtual account details\n• Your notification and device tokens, rewards and referral records\n\nWhat we keep, and why:\n• A record of past financial transactions, with the link to your identity removed, because we are required to retain transaction records for tax and anti-fraud purposes.\n\nWe will confirm by email once the deletion is complete. We aim to action requests within 7 days, and always within 30 days. Deletion is permanent and cannot be undone; any remaining wallet balance is forfeited.",
  },
  { key: "copyright", text: "© {year} {store} — All Rights Reserved" },
];

const termsEn: LegalDocument = [
  { key: "meta", text: "Effective Date: {date}" },
  {
    key: "intro",
    text: "Welcome to {store}, a mobile data reselling platform.\nThese Terms and Conditions govern your access to and use of our mobile application and services.\nBy using the platform, you agree to be bound by these Terms.",
  },
  {
    key: "s1",
    text: "1. About Us\n{store} is a technology company based in {country} offering mobile data services nationwide.\n• 📧 Email: {email}",
  },
  {
    key: "s2",
    text: "2. Acceptance of Terms\nBy using our platform, you confirm that:\n• You are at least 18 years old\n• You have read and agree to these Terms\n• You will not use the platform for unlawful activities",
  },
  {
    key: "s3",
    text: "3. Services\n{store} provides mobile data bundles via our app.\n• Payments are processed by our banking partners\n• A 10% processing fee applies to deposits",
  },
  {
    key: "s4",
    text: "4. Account Registration\nYou agree to:\n• Provide accurate information (username, phone number, email)\n• Keep your login credentials secure\n• Accept responsibility for all account activities",
  },
  {
    key: "s5",
    text: "5. Payments and Deposits\n• 10% fee deducted from deposits\n• We do not store card or bank details\n• All transactions are final and non-refundable",
  },
  {
    key: "s6",
    text: "6. Delivery of Services\n• Data bundles delivered instantly or within short processing window\n• Delays may occur due to network issues\n• Once delivered, no refunds will be issued",
  },
  {
    key: "s7",
    text: "7. Prohibited Activities\nYou agree not to:\n• Use the platform for illegal purposes\n• Resell services without written approval\n• Impersonate {store} or its team\n• Upload malicious software\n• Misrepresent our services or pricing",
  },
  {
    key: "s8",
    text: "8. Third-Party Services\nWe integrate with:\n• Payment providers - Payment processing\n• Telecom APIs - Data delivery\nEach operates under its own terms.",
  },
  {
    key: "s9",
    text: "9. Suspension and Termination\nWe reserve the right to suspend or terminate accounts at any time. This may result in loss of wallet balance and access to services.",
  },
  {
    key: "s10",
    text: "10. No Guarantees or Refunds\n• Services provided \"as-is\" and \"as-available\"\n• No guarantee of uninterrupted service\n• No refunds after service delivery",
  },
  {
    key: "s11",
    text: "11. Changes to Terms\nWe may update these Terms periodically. Continued use indicates acceptance.",
  },
  {
    key: "s12",
    text: "12. Governing Law\nThese Terms are governed by the laws of {country}.",
  },
  { key: "s13", text: "13. Contact Us\n{store}\n📧 Email: {email}" },
  { key: "copyright", text: "© {year} {store} — All Rights Reserved" },
];

export const ENGLISH_DOCUMENTS: Record<LegalDocId, LegalDocument> = {
  privacy: privacyEn,
  terms: termsEn,
};

const privacyFr: LegalDocument = [
  { key: "meta", text: "Dernière mise à jour : {date}" },
  {
    key: "intro",
    text: "Chez {store}, votre vie privée et la protection de vos données sont de la plus haute importance pour nous. La présente Politique de confidentialité explique les types de données que nous collectons, la manière dont nous les utilisons et vos droits concernant vos informations.\nEn utilisant notre application, vous reconnaissez et acceptez les pratiques décrites dans les présentes.",
  },
  {
    key: "s1",
    text: "1. Consentement\nEn accédant à l'application mobile {store} ou en l'utilisant, vous acceptez la présente Politique de confidentialité. Si vous n'êtes pas d'accord avec nos politiques ou nos pratiques, veuillez ne pas utiliser l'application.",
  },
  {
    key: "s2",
    text: "2. Qui sommes-nous\n{store} est une plateforme de revente de données mobiles établie en {country}. Nous fournissons des services de données mobiles sécurisés, abordables et rapides aux utilisateurs à travers {country}.\n• 📧 E-mail de contact : {email}",
  },
  {
    key: "s3",
    text: "3. Informations que nous collectons\nNous collectons des informations personnelles et techniques afin de garantir des transactions sécurisées et d'améliorer votre expérience utilisateur.\na. Informations personnelles\n• Nom d'utilisateur\n• Numéro de téléphone\n• Adresse e-mail\nb. Informations sur le compte et les transactions\n• Sélections de forfaits de données et historique d'achats\n• Confirmation et statut du paiement\n• Activité du portefeuille ou des rechargements\nc. Informations sur l'appareil et l'utilisation\n• Modèle d'appareil et système d'exploitation\n• Données d'utilisation de l'application\n• Journaux de plantage et données de performance\nd. Assistance et communication\n• Lorsque vous nous contactez, nous collectons le contenu du message afin de résoudre efficacement votre problème.",
  },
  {
    key: "s4",
    text: "4. Comment nous utilisons vos informations\nVos informations sont utilisées pour :\n• Exploiter et maintenir l'application {store}\n• Traiter et vérifier les achats de données mobiles\n• Améliorer les performances de l'application et l'expérience utilisateur\n• Prévenir la fraude et assurer la sécurité de la plateforme\n• Communiquer avec vous au sujet des achats, des mises à jour ou des changements de service\n• Fournir une assistance client réactive",
  },
  {
    key: "s5",
    text: "5. Paiements et sécurité financière\nTous les paiements sont traités de manière sécurisée par nos partenaires bancaires.\n{store} ne conserve aucune coordonnée de carte ou de compte bancaire.\nDes frais de traitement de 10 % s'appliquent à tous les dépôts.",
  },
  {
    key: "s6",
    text: "6. Intégrations tierces\nNotre application s'intègre avec :\n• Fournisseurs de paiement - Traitement des paiements\n• Fournisseurs d'API de données - Pour la livraison des données mobiles\nChaque service fonctionne selon sa propre politique de confidentialité.",
  },
  {
    key: "s7",
    text: "7. Droits en matière de protection des données\nVous avez le droit de :\n• Accéder à vos données personnelles\n• Corriger des données inexactes\n• Demander la suppression de vos données\n• Restreindre notre utilisation de vos données\n• Vous opposer au traitement des données\n• Transférer vos données vers une autre plateforme\n📩 Contact : {email}",
  },
  {
    key: "s8",
    text: "8. Confidentialité des enfants\nNos services ne s'adressent pas aux enfants de moins de 13 ans. Nous ne collectons pas sciemment de données auprès de mineurs.",
  },
  {
    key: "s9",
    text: "9. Mises à jour de la présente Politique de confidentialité\nNous pouvons réviser la présente Politique de confidentialité périodiquement. Vous serez informé des changements majeurs.",
  },
  {
    key: "s10",
    text: "10. Nous contacter\n{store}\n📧 E-mail : {email}",
  },
  {
    key: "s11",
    text: "11. Comment demander la suppression de votre compte\nVous pouvez à tout moment nous demander de supprimer votre compte {store} et ses données.\n\nPour demander la suppression, envoyez un e-mail à {email} depuis l'adresse e-mail enregistrée sur votre compte, avec l'objet « Demande de suppression de compte ».\n\nVeuillez indiquer :\n• L'adresse e-mail ou le numéro de téléphone associé au compte\n• Votre nom d'utilisateur\n• Le nom de la boutique : {store}\n\nCe que nous supprimons :\n• Votre profil et vos identifiants de connexion\n• L'enregistrement du solde de votre portefeuille\n• Votre historique d'achats et de transactions\n• Les coordonnées de votre compte virtuel enregistré\n• Vos jetons de notification et d'appareil, vos récompenses et vos parrainages\n\nCe que nous conservons, et pourquoi :\n• Une trace des transactions financières passées, le lien avec votre identité ayant été supprimé, car nous sommes tenus de conserver les relevés de transactions à des fins fiscales et de lutte contre la fraude.\n\nNous confirmerons par e-mail une fois la suppression effectuée. Nous visons un traitement sous 7 jours, et toujours sous 30 jours. La suppression est définitive et irréversible ; tout solde de portefeuille restant est perdu.",
  },
  { key: "copyright", text: "© {year} {store} — Tous droits réservés" },
];

const termsFr: LegalDocument = [
  { key: "meta", text: "Date d'entrée en vigueur : {date}" },
  {
    key: "intro",
    text: "Bienvenue sur {store}, une plateforme de revente de données mobiles.\nLes présentes Conditions générales régissent votre accès à notre application mobile et à nos services, ainsi que leur utilisation.\nEn utilisant la plateforme, vous acceptez d'être lié par les présentes Conditions.",
  },
  {
    key: "s1",
    text: "1. À propos de nous\n{store} est une entreprise technologique établie en {country} offrant des services de données mobiles dans tout le pays.\n• 📧 E-mail : {email}",
  },
  {
    key: "s2",
    text: "2. Acceptation des Conditions\nEn utilisant notre plateforme, vous confirmez que :\n• Vous avez au moins 18 ans\n• Vous avez lu et accepté les présentes Conditions\n• Vous n'utiliserez pas la plateforme à des fins illicites",
  },
  {
    key: "s3",
    text: "3. Services\n{store} fournit des forfaits de données mobiles via notre application.\n• Les paiements sont traités par nos partenaires bancaires\n• Des frais de traitement de 10 % s'appliquent aux dépôts",
  },
  {
    key: "s4",
    text: "4. Création de compte\nVous acceptez de :\n• Fournir des informations exactes (nom d'utilisateur, numéro de téléphone, e-mail)\n• Garder vos identifiants de connexion en sécurité\n• Assumer la responsabilité de toutes les activités de votre compte",
  },
  {
    key: "s5",
    text: "5. Paiements et dépôts\n• Frais de 10 % déduits des dépôts\n• Nous ne conservons aucune coordonnée de carte ou de compte bancaire\n• Toutes les transactions sont définitives et non remboursables",
  },
  {
    key: "s6",
    text: "6. Fourniture des services\n• Forfaits de données livrés instantanément ou dans un court délai de traitement\n• Des retards peuvent survenir en raison de problèmes de réseau\n• Une fois livrés, aucun remboursement ne sera effectué",
  },
  {
    key: "s7",
    text: "7. Activités interdites\nVous acceptez de ne pas :\n• Utiliser la plateforme à des fins illégales\n• Revendre les services sans autorisation écrite\n• Usurper l'identité de {store} ou de son équipe\n• Téléverser des logiciels malveillants\n• Faire une fausse déclaration de nos services ou de nos tarifs",
  },
  {
    key: "s8",
    text: "8. Services tiers\nNous nous intégrons avec :\n• Fournisseurs de paiement - Traitement des paiements\n• API de télécommunications - Livraison des données\nChacun fonctionne selon ses propres conditions.",
  },
  {
    key: "s9",
    text: "9. Suspension et résiliation\nNous nous réservons le droit de suspendre ou de résilier des comptes à tout moment. Cela peut entraîner la perte du solde du portefeuille et de l'accès aux services.",
  },
  {
    key: "s10",
    text: "10. Absence de garanties ou de remboursements\n• Services fournis « en l'état » et « selon disponibilité »\n• Aucune garantie de service ininterrompu\n• Aucun remboursement après la fourniture du service",
  },
  {
    key: "s11",
    text: "11. Modification des Conditions\nNous pouvons mettre à jour les présentes Conditions périodiquement. L'utilisation continue vaut acceptation.",
  },
  {
    key: "s12",
    text: "12. Droit applicable\nLes présentes Conditions sont régies par les lois de {country}.",
  },
  { key: "s13", text: "13. Nous contacter\n{store}\n📧 E-mail : {email}" },
  { key: "copyright", text: "© {year} {store} — Tous droits réservés" },
];

const privacyEs: LegalDocument = [
  { key: "meta", text: "Última actualización: {date}" },
  {
    key: "intro",
    text: "En {store}, su privacidad y la protección de sus datos son de suma importancia para nosotros. Esta Política de privacidad explica los tipos de datos que recopilamos, cómo los utilizamos y sus derechos sobre su información.\nAl utilizar nuestra aplicación, usted reconoce y acepta las prácticas aquí descritas.",
  },
  {
    key: "s1",
    text: "1. Consentimiento\nAl acceder o utilizar la aplicación móvil {store}, usted acepta esta Política de privacidad. Si no está de acuerdo con nuestras políticas o prácticas, no utilice la aplicación.",
  },
  {
    key: "s2",
    text: "2. Quiénes somos\n{store} es una plataforma de reventa de datos móviles con sede en {country}. Ofrecemos servicios de datos móviles seguros, asequibles y rápidos a usuarios de todo {country}.\n• 📧 Correo de contacto: {email}",
  },
  {
    key: "s3",
    text: "3. Información que recopilamos\nRecopilamos información personal y técnica para garantizar transacciones seguras y mejorar su experiencia de usuario.\na. Información personal\n• Nombre de usuario\n• Número de teléfono\n• Dirección de correo electrónico\nb. Información de cuenta y transacciones\n• Selección de planes de datos e historial de compras\n• Confirmación y estado del pago\n• Actividad de la cartera o de las recargas\nc. Información del dispositivo y de uso\n• Modelo de dispositivo y sistema operativo\n• Datos de uso de la aplicación\n• Registros de fallos y datos de rendimiento\nd. Soporte y comunicación\n• Cuando se comunica con nosotros, recopilamos el contenido del mensaje para resolver su problema de manera eficaz.",
  },
  {
    key: "s4",
    text: "4. Cómo utilizamos su información\nSu información se utiliza para:\n• Operar y mantener la aplicación {store}\n• Procesar y verificar compras de datos móviles\n• Mejorar el rendimiento de la aplicación y la experiencia del usuario\n• Prevenir el fraude y garantizar la seguridad de la plataforma\n• Comunicarnos con usted sobre compras, actualizaciones o cambios en el servicio\n• Proporcionar un soporte al cliente ágil",
  },
  {
    key: "s5",
    text: "5. Pagos y seguridad financiera\nTodos los pagos son procesados de forma segura por nuestros socios bancarios.\n{store} no almacena datos de tarjetas ni de cuentas bancarias.\nSe aplica una comisión de procesamiento del 10 % a todos los depósitos.",
  },
  {
    key: "s6",
    text: "6. Integraciones de terceros\nNuestra aplicación se integra con:\n• Proveedores de pago - Procesamiento de pagos\n• Proveedores de API de datos - Para la entrega de datos móviles\nCada servicio opera bajo su propia política de privacidad.",
  },
  {
    key: "s7",
    text: "7. Derechos de protección de datos\nUsted tiene derecho a:\n• Acceder a sus datos personales\n• Corregir datos inexactos\n• Solicitar la eliminación de sus datos\n• Restringir el uso que hacemos de sus datos\n• Oponerse al tratamiento de datos\n• Transferir sus datos a otra plataforma\n📩 Contacto: {email}",
  },
  {
    key: "s8",
    text: "8. Privacidad de los menores\nNuestros servicios no están dirigidos a menores de 13 años. No recopilamos conscientemente datos de menores.",
  },
  {
    key: "s9",
    text: "9. Actualizaciones de esta Política de privacidad\nPodemos revisar esta Política de privacidad periódicamente. Se le notificarán los cambios importantes.",
  },
  { key: "s10", text: "10. Contacto\n{store}\n📧 Correo: {email}" },
  {
    key: "s11",
    text: "11. Cómo solicitar la eliminación de la cuenta\nPuede solicitarnos en cualquier momento que eliminemos su cuenta de {store} y sus datos.\n\nPara solicitar la eliminación, escriba a {email} desde la dirección de correo registrada en su cuenta, con el asunto «Solicitud de eliminación de cuenta».\n\nIncluya:\n• La dirección de correo o el número de teléfono de la cuenta\n• Su nombre de usuario\n• El nombre de la tienda: {store}\n\nQué eliminamos:\n• Su perfil y credenciales de acceso\n• El registro del saldo de su cartera\n• Su historial de compras y transacciones\n• Los datos de su cuenta virtual guardada\n• Sus tokens de notificación y de dispositivo, recompensas y registros de referidos\n\nQué conservamos y por qué:\n• Un registro de transacciones financieras pasadas, sin el vínculo con su identidad, porque estamos obligados a conservar registros de transacciones con fines fiscales y de prevención del fraude.\n\nConfirmaremos por correo electrónico una vez completada la eliminación. Nuestro objetivo es atender las solicitudes en un plazo de 7 días y siempre dentro de 30 días. La eliminación es permanente e irreversible; cualquier saldo restante de la cartera se pierde.",
  },
  { key: "copyright", text: "© {year} {store} — Todos los derechos reservados" },
];

const termsEs: LegalDocument = [
  { key: "meta", text: "Fecha de entrada en vigor: {date}" },
  {
    key: "intro",
    text: "Bienvenido a {store}, una plataforma de reventa de datos móviles.\nEstos Términos y Condiciones rigen su acceso y uso de nuestra aplicación móvil y servicios.\nAl utilizar la plataforma, usted acepta quedar vinculado por estos Términos.",
  },
  {
    key: "s1",
    text: "1. Sobre nosotros\n{store} es una empresa tecnológica con sede en {country} que ofrece servicios de datos móviles en todo el país.\n• 📧 Correo: {email}",
  },
  {
    key: "s2",
    text: "2. Aceptación de los Términos\nAl utilizar nuestra plataforma, usted confirma que:\n• Tiene al menos 18 años\n• Ha leído y acepta estos Términos\n• No utilizará la plataforma para actividades ilícitas",
  },
  {
    key: "s3",
    text: "3. Servicios\n{store} proporciona paquetes de datos móviles a través de nuestra aplicación.\n• Los pagos son procesados por nuestros socios bancarios\n• Se aplica una comisión de procesamiento del 10 % a los depósitos",
  },
  {
    key: "s4",
    text: "4. Registro de cuenta\nUsted acepta:\n• Proporcionar información exacta (nombre de usuario, número de teléfono, correo electrónico)\n• Mantener seguras sus credenciales de acceso\n• Asumir la responsabilidad de toda la actividad de su cuenta",
  },
  {
    key: "s5",
    text: "5. Pagos y depósitos\n• Comisión del 10 % deducida de los depósitos\n• No almacenamos datos de tarjetas ni de cuentas bancarias\n• Todas las transacciones son definitivas y no reembolsables",
  },
  {
    key: "s6",
    text: "6. Prestación de los servicios\n• Paquetes de datos entregados al instante o en un breve plazo de procesamiento\n• Pueden producirse retrasos por problemas de red\n• Una vez entregados, no se emitirán reembolsos",
  },
  {
    key: "s7",
    text: "7. Actividades prohibidas\nUsted acepta no:\n• Utilizar la plataforma con fines ilegales\n• Revender los servicios sin autorización escrita\n• Suplantar la identidad de {store} o de su equipo\n• Cargar software malicioso\n• Declarar falsamente nuestros servicios o precios",
  },
  {
    key: "s8",
    text: "8. Servicios de terceros\nNos integramos con:\n• Proveedores de pago - Procesamiento de pagos\n• API de telecomunicaciones - Entrega de datos\nCada uno opera bajo sus propios términos.",
  },
  {
    key: "s9",
    text: "9. Suspensión y cancelación\nNos reservamos el derecho de suspender o cancelar cuentas en cualquier momento. Esto puede suponer la pérdida del saldo de la cartera y del acceso a los servicios.",
  },
  {
    key: "s10",
    text: "10. Sin garantías ni reembolsos\n• Servicios prestados «tal cual» y «según disponibilidad»\n• Sin garantía de servicio ininterrumpido\n• Sin reembolsos tras la prestación del servicio",
  },
  {
    key: "s11",
    text: "11. Cambios en los Términos\nPodemos actualizar estos Términos periódicamente. El uso continuado indica aceptación.",
  },
  {
    key: "s12",
    text: "12. Ley aplicable\nEstos Términos se rigen por las leyes de {country}.",
  },
  { key: "s13", text: "13. Contacto\n{store}\n📧 Correo: {email}" },
  { key: "copyright", text: "© {year} {store} — Todos los derechos reservados" },
];

const privacyAr: LegalDocument = [
  { key: "meta", text: "آخر تحديث: {date}" },
  {
    key: "intro",
    text: "في {store}، نولي خصوصيتك وحماية بياناتك أهمية قصوى. توضح سياسة الخصوصية هذه أنواع البيانات التي نجمعها وكيفية استخدامها وحقوقك المتعلقة بمعلوماتك.\nباستخدامك لتطبيقنا، فإنك تقر وتوافق على الممارسات الموضحة هنا.",
  },
  {
    key: "s1",
    text: "1. الموافقة\nبدخولك إلى تطبيق {store} للهاتف المحمول أو استخدامه، فإنك توافق على سياسة الخصوصية هذه. وإذا كنت لا توافق على سياساتنا أو ممارساتنا، فيرجى عدم استخدام التطبيق.",
  },
  {
    key: "s2",
    text: "2. من نحن\n{store} منصة لإعادة بيع بيانات الهاتف المحمول مقرها في {country}. نحن نقدم خدمات بيانات محمولة آمنة وميسورة وسريعة للمستخدمين في جميع أنحاء {country}.\n• 📧 البريد الإلكتروني للتواصل: {email}",
  },
  {
    key: "s3",
    text: "3. المعلومات التي نجمعها\nنجمع معلومات شخصية وتقنية لضمان أمان المعاملات وتحسين تجربتك كمستخدم.\na. المعلومات الشخصية\n• اسم المستخدم\n• رقم الهاتف\n• عنوان البريد الإلكتروني\nb. معلومات الحساب والمعاملات\n• اختيارات باقات البيانات وسجل الشراء\n• تأكيد الدفع وحالته\n• نشاط المحفظة أو إعادة التعبئة\nc. معلومات الجهاز والاستخدام\n• طراز الجهاز ونظام التشغيل\n• بيانات استخدام التطبيق\n• سجلات الأعطال وبيانات الأداء\nd. الدعم والتواصل\n• عند تواصلك معنا، نجمع محتوى الرسالة لمعالجة مشكلتك بفعالية.",
  },
  {
    key: "s4",
    text: "4. كيف نستخدم معلوماتك\nتُستخدم معلوماتك من أجل:\n• تشغيل تطبيق {store} وصيانته\n• معالجة مشتريات بيانات الهاتف المحمول والتحقق منها\n• تحسين أداء التطبيق وتجربة المستخدم\n• منع الاحتيال وضمان أمان المنصة\n• التواصل معك بشأن المشتريات أو التحديثات أو تغييرات الخدمة\n• تقديم دعم سريع للعملاء",
  },
  {
    key: "s5",
    text: "5. المدفوعات والأمان المالي\nتتم معالجة جميع المدفوعات بشكل آمن من قبل شركائنا المصرفيين.\nلا يحتفظ {store} بأي تفاصيل للبطاقات أو الحسابات المصرفية.\nتُطبق رسوم معالجة بنسبة 10% على جميع الإيداعات.",
  },
  {
    key: "s6",
    text: "6. التكامل مع جهات خارجية\nيتكامل تطبيقنا مع:\n• مزودي خدمات الدفع - معالجة المدفوعات\n• مزودي واجهات برمجة بيانات - لتوصيل بيانات الهاتف المحمول\nيعمل كل خدمة وفق سياسة الخصوصية الخاصة به.",
  },
  {
    key: "s7",
    text: "7. حقوق حماية البيانات\nيحق لك:\n• الوصول إلى بياناتك الشخصية\n• تصحيح البيانات غير الدقيقة\n• طلب حذف بياناتك\n• تقييد استخدامنا لبياناتك\n• الاعتراض على معالجة البيانات\n• نقل بياناتك إلى منصة أخرى\n📩 التواصل: {email}",
  },
  {
    key: "s8",
    text: "8. خصوصية الأطفال\nخدماتنا غير موجهة للأطفال دون سن 13 عامًا. ولا نجمع بيانات القاصرين عن علم.",
  },
  {
    key: "s9",
    text: "9. تحديثات سياسة الخصوصية هذه\nقد نراجع سياسة الخصوصية هذه دوريًا. وسيتم إخطارك بالتغييرات الجوهرية.",
  },
  { key: "s10", text: "10. اتصل بنا\n{store}\n📧 البريد الإلكتروني: {email}" },
  {
    key: "s11",
    text: "11. كيفية طلب حذف الحساب\nيمكنك أن تطلب منا في أي وقت حذف حسابك في {store} وبياناته.\n\nلطلب الحذف، أرسل بريدًا إلكترونيًا إلى {email} من عنوان البريد المسجل في حسابك، بعنوان \"طلب حذف الحساب\".\n\nيرجى تضمين:\n• عنوان البريد الإلكتروني أو رقم الهاتف المرتبط بالحساب\n• اسم المستخدم الخاص بك\n• اسم المتجر: {store}\n\nما نحذفه:\n• ملفك الشخصي وبيانات اعتماد تسجيل الدخول\n• سجل رصيد محفظتك\n• سجل مشترياتك ومعاملاتك\n• تفاصيل حسابك الافتراضي المحفوظة\n• رموز الإشعارات والأجهزة والمكافآت وسجلات الإحالة\n\nما نحتفظ به ولماذا:\n• سجل بالمعاملات المالية السابقة، بعد إزالة الرابط الذي يربطه بهويتك، لأننا ملزمون بالاحتفاظ بسجلات المعاملات لأغراض الضرائب ومكافحة الاحتيال.\n\nسنؤكد لك عبر البريد الإلكتروني بعد اكتمال الحذف. نهدف إلى تنفيذ الطلبات خلال 7 أيام، ودائمًا خلال 30 يومًا. الحذف نهائي ولا يمكن التراجع عنه؛ ويُفقد أي رصيد متبقٍ في المحفظة.",
  },
  { key: "copyright", text: "© {year} {store} — جميع الحقوق محفوظة" },
];

const termsAr: LegalDocument = [
  { key: "meta", text: "تاريخ السريان: {date}" },
  {
    key: "intro",
    text: "مرحبًا بك في {store}، منصة لإعادة بيع بيانات الهاتف المحمول.\nتحكم هذه الشروط والأحكام وصولك إلى تطبيقنا للهاتف المحمول وخدماتنا واستخدامك لهما.\nباستخدامك للمنصة، فإنك توافق على الالتزام بهذه الشروط.",
  },
  {
    key: "s1",
    text: "1. من نحن\n{store} شركة تقنية مقرها في {country} تقدم خدمات بيانات الهاتف المحمول على مستوى الدولة.\n• 📧 البريد الإلكتروني: {email}",
  },
  {
    key: "s2",
    text: "2. قبول الشروط\nباستخدامك لمنصتنا، فإنك تؤكد أنك:\n• تبلغ 18 عامًا على الأقل\n• قرأت هذه الشروط ووافقت عليها\n• لن تستخدم المنصة في أنشطة غير قانونية",
  },
  {
    key: "s3",
    text: "3. الخدمات\nيقدم {store} باقات بيانات الهاتف المحمول عبر تطبيقنا.\n• تتم معالجة المدفوعات من قبل شركائنا المصرفيين\n• تُطبق رسوم معالجة بنسبة 10% على الإيداعات",
  },
  {
    key: "s4",
    text: "4. تسجيل الحساب\nأنت توافق على:\n• تقديم معلومات دقيقة (اسم المستخدم، رقم الهاتف، البريد الإلكتروني)\n• الحفاظ على أمان بيانات اعتماد تسجيل الدخول\n• تحمل المسؤولية عن جميع أنشطة الحساب",
  },
  {
    key: "s5",
    text: "5. المدفوعات والإيداعات\n• تُخصم رسوم بنسبة 10% من الإيداعات\n• لا نحتفظ بتفاصيل البطاقات أو الحسابات المصرفية\n• جميع المعاملات نهائية وغير قابلة للاسترداد",
  },
  {
    key: "s6",
    text: "6. تقديم الخدمات\n• تُسلَّم باقات البيانات فورًا أو خلال فترة معالجة قصيرة\n• قد تحدث تأخيرات بسبب مشكلات الشبكة\n• بعد التسليم، لن يتم إصدار أي مبالغ مستردة",
  },
  {
    key: "s7",
    text: "7. الأنشطة المحظورة\nأنت توافق على عدم:\n• استخدام المنصة لأغراض غير قانونية\n• إعادة بيع الخدمات دون موافقة كتابية\n• انتحال شخصية {store} أو فريقه\n• تحميل برامج ضارة\n• تقديم معلومات مضللة عن خدماتنا أو أسعارنا",
  },
  {
    key: "s8",
    text: "8. خدمات الجهات الخارجية\nنتكامل مع:\n• مزودي خدمات الدفع - معالجة المدفوعات\n• واجهات برمجة الاتصالات - توصيل البيانات\nيعمل كل منها وفق شروطه الخاصة.",
  },
  {
    key: "s9",
    text: "9. التعليق والإنهاء\nنحتفظ بالحق في تعليق الحسابات أو إنهائها في أي وقت. وقد يؤدي ذلك إلى فقدان رصيد المحفظة والوصول إلى الخدمات.",
  },
  {
    key: "s10",
    text: "10. لا ضمانات ولا مبالغ مستردة\n• تُقدَّم الخدمات \"كما هي\" و\"حسب التوفر\"\n• لا ضمان لاستمرارية الخدمة دون انقطاع\n• لا مبالغ مستردة بعد تقديم الخدمة",
  },
  {
    key: "s11",
    text: "11. التغييرات على الشروط\nقد نحدّث هذه الشروط دوريًا. ويُعد الاستخدام المستمر موافقة عليها.",
  },
  {
    key: "s12",
    text: "12. القانون الحاكم\nتخضع هذه الشروط لقوانين {country}.",
  },
  { key: "s13", text: "13. اتصل بنا\n{store}\n📧 البريد الإلكتروني: {email}" },
  { key: "copyright", text: "© {year} {store} — جميع الحقوق محفوظة" },
];

/** Non-English drafts. Partial is allowed; missing sections fall back to English. */
export const TRANSLATED_DOCUMENTS: Partial<
  Record<LegalLocale, Record<LegalDocId, LegalDocument>>
> = {
  fr: { privacy: privacyFr, terms: termsFr },
  es: { privacy: privacyEs, terms: termsEs },
  ar: { privacy: privacyAr, terms: termsAr },
};
