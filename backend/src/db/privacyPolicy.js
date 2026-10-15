// Informativa privacy di Dergano & Dragons (art. 13 GDPR).
// Ogni volta che cambia in modo sostanziale, aumentare PRIVACY_VERSION: gli utenti già iscritti
// la riaccetteranno al primo accesso. Il testo resta modificabile dall'admin (tab Privacy).
const PRIVACY_VERSION = 2;

const PRIVACY_POLICY = `Questa informativa spiega quali dati personali raccoglie Dergano & Dragons, il sito per iscriversi alle sessioni di gioco di ruolo per ragazzi alla libreria Scamamu, perché li usa, dove sono conservati e quali diritti hai. È scritta ai sensi dell'art. 13 del Regolamento (UE) 2016/679 ("GDPR").

1. Chi tratta i tuoi dati
Titolare del trattamento è Luca Cenci, organizzatore di Dergano & Dragons. Per qualunque domanda o richiesta sui tuoi dati puoi scrivere a sicurezza.cenci@gmail.com.

2. Quali dati raccogliamo
Dati dell'account: nome (o nome da giocatore), indirizzo email e password. La password è salvata solo in forma cifrata (hash): nessuno, nemmeno l'amministratore, può leggerla.
Dati di partecipazione: le sessioni a cui ti iscrivi, i posti prenotati, l'eventuale presenza in lista d'attesa, i tavoli (gruppi) di cui fai parte e le schede personaggio che ti vengono assegnate.
Preferenze: se hai accettato o meno la newsletter, la data in cui hai accettato questa informativa e la data dell'ultimo accesso.
Dati tecnici: per funzionare il sito salva sul tuo dispositivo, nella memoria del browser, il codice di accesso (per non chiederti la password ogni volta) e alcune preferenze di visualizzazione come il tema chiaro o scuro. Non usiamo cookie di profilazione, strumenti di analisi o pubblicità.
Se ricevi un invito, conserviamo l'indirizzo email a cui l'abbiamo mandato e la data dell'invio.

3. Perché li usiamo e su quale base
a) Creare e gestire il tuo account, le iscrizioni alle sessioni e le liste d'attesa, e inviarti le email di servizio (conferma d'iscrizione, promozione dalla lista d'attesa, avvisi su cambi di orario o annullamenti, recupero della password). Base giuridica: esecuzione del servizio che hai richiesto iscrivendoti (art. 6.1.b GDPR).
b) Inviarti la newsletter con le nuove sessioni e le novità della gilda. Base giuridica: il tuo consenso (art. 6.1.a GDPR), facoltativo e revocabile in ogni momento da «Il mio account» o dal link presente in ogni newsletter. Se non lo dai, puoi usare il sito normalmente.
c) Invitare una persona a iscriversi, su indicazione dell'organizzatore: l'email serve solo per spedire l'invito. Base giuridica: legittimo interesse a far conoscere l'attività (art. 6.1.f GDPR). Se non ti iscrivi, l'indirizzo viene cancellato entro 6 mesi; puoi chiederne la cancellazione subito scrivendo al contatto indicato sopra.
I tuoi dati non vengono venduti, ceduti a terzi per fini commerciali, né usati per profilazione o decisioni automatizzate.

4. Chi vede i tuoi dati
Gli altri iscritti vedono il tuo nome nell'elenco dei partecipanti delle sessioni a cui ti iscrivi. Non vedono la tua email.
L'organizzatore e gli amministratori del sito vedono nome, email, iscrizioni e preferenze, per gestire le sessioni.
Per far funzionare il sito ci avvaliamo di fornitori che trattano i dati per nostro conto, in qualità di responsabili del trattamento:
- Neon Inc. (database): conserva i dati su server negli Stati Uniti (Virginia);
- Render Services Inc. (server dell'applicazione): server in Germania (Francoforte);
- Vercel Inc. (pubblicazione del sito): rete di server, per l'Europa a Francoforte;
- Brevo (Sendinblue SAS, Francia): invio delle email.
Il trasferimento verso gli Stati Uniti avviene sulla base delle garanzie previste dal GDPR: il Data Privacy Framework UE-USA, ove il fornitore vi aderisce, e le clausole contrattuali standard approvate dalla Commissione Europea, incluse negli accordi sul trattamento dei dati di questi fornitori.

5. Minori
Il sito è pensato anche per ragazzi. In Italia chi ha meno di 14 anni non può dare da solo il consenso ai servizi online: per loro la registrazione deve essere fatta, o autorizzata, da un genitore o da chi ne ha la responsabilità, che lo dichiara al momento dell'iscrizione. Consigliamo di usare l'email di un genitore per gli account dei più piccoli: le comunicazioni arriveranno a lui. L'organizzatore può chiedere conferma del consenso e cancellare gli account per cui non viene dato.

6. Per quanto tempo li conserviamo
Finché il tuo account è attivo. Gli account senza accessi né iscrizioni da 24 mesi vengono cancellati automaticamente, insieme alle iscrizioni collegate. Puoi cancellare il tuo account in qualunque momento da «Elimina il mio account»: i dati vengono rimossi subito dal database. Le email inviate restano nei registri del fornitore di posta per il tempo tecnico da esso previsto (in genere non oltre qualche mese). Gli inviti a cui non segue l'iscrizione vengono cancellati entro 6 mesi.

7. I tuoi diritti
Puoi in ogni momento: sapere quali dati abbiamo e averne copia (accesso e portabilità); correggerli; chiederne la cancellazione (anche da solo, eliminando l'account); limitarne l'uso o opporti al trattamento basato sul legittimo interesse; revocare il consenso alla newsletter, senza conseguenze sul resto del servizio. Per esercitarli scrivi a sicurezza.cenci@gmail.com: rispondiamo entro 30 giorni. Se ritieni che i tuoi dati siano trattati in modo non corretto puoi presentare reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).

8. Sicurezza
Le comunicazioni con il sito sono cifrate (HTTPS), le password sono conservate solo in forma cifrata e i link per reimpostarle valgono un'ora e una sola volta. Le funzioni di amministrazione sono riservate agli organizzatori.

9. Modifiche
Se questa informativa cambia in modo importante te lo chiederemo di nuovo al primo accesso. La data dell'ultimo aggiornamento è indicata in cima alla pagina.`;

module.exports = { PRIVACY_POLICY, PRIVACY_VERSION };
