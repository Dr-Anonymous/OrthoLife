export const CONSENT_RISKS = {
        en: {
                general: `<h2>General Surgical Risks</h2>
<ul>
<li><strong>Bleeding</strong>: Excessive bleeding during or after surgery, which might require a blood transfusion.</li>
<li><strong>Infection</strong>: Risk of infection at the incision site or deeper in the body, potentially requiring antibiotics or further surgery.</li>
<li><strong>Scarring</strong>: Permanent scars will form at the incision sites, which may be painful or unsightly.</li>
<li><strong>Pain</strong>: Post-surgical pain is expected and will be managed with medication, but chronic pain may persist in rare cases.</li>
<li><strong>Blood Clots</strong>: Clots may form in the legs (DVT) and travel to the lungs (PE), which can be life-threatening.</li>
<li><strong>Heart/Lung Issues</strong>: Stress on the body may rarely cause heart attack, stroke, or breathing problems.</li>
</ul>`,
                anesthesia: `<h2>Anesthesia Risks</h2>
<ul>
<li><strong>Allergic Reactions</strong>: Rare but serious reactions to medications used during anesthesia.</li>
<li><strong>Nausea/Vomiting</strong>: Common side effects after waking up, usually temporary.</li>
<li><strong>Breathing Issues</strong>: Temporary difficulty in breathing or throat irritation from the breathing tube.</li>
<li><strong>Nerve Damage</strong>: Rare risk of temporary or permanent nerve injury from needle placement or positioning.</li>
<li><strong>Awareness</strong>: Extremely rare chance of being partially awake or recalling events during surgery.</li>
</ul>`,
                procedure_placeholder: `<h2>Procedure Specific Risks</h2>
<ul>
<li><strong>Specific Nerve Injury</strong>: Risk of damage to nerves near the surgical site causing numbness or weakness.</li>
<li><strong>Stiffness</strong>: Reduced range of motion in the operated joint or area.</li>
<li><strong>Hardware Issues</strong>: Implants (if used) may loosen, break, or cause irritation over time.</li>
<li><strong>Incomplete Relief</strong>: Surgery may not completely resolve all symptoms or pain.</li>
<li><strong>Need for Revision</strong>: Possibility of needing further surgery in the future.</li>
</ul>`,
                declaration: (name: string, procedure: string) => `I, ${name}, confirm that the nature of the ${procedure} procedure, its purpose, benefits, and possible alternative treatments have been explained to me in language I understand. I have read (or had read to me) the risks listed above and I have had the opportunity to ask questions. I voluntarily give my consent for this procedure.`
        },
        te: {
                general: `<h2>సాధారణ శస్త్రచికిత్స ప్రమాదాలు</h2>
<ul>
<li><strong>రక్తస్రావం</strong>: ఆపరేషన్ సమయంలో లేదా తర్వాత ఎక్కువ రక్తం పోవడం; కొన్నిసార్లు రక్తం ఎక్కించాల్సి రావచ్చు.</li>
<li><strong>ఇన్ఫెక్షన్ (చీము పట్టడం)</strong>: కుట్లు వేసిన చోట లేదా లోపల చీము పట్టే అవకాశం ఉంది. దీనికి మందులు లేదా మరో చిన్న ఆపరేషన్ అవసరం కావచ్చు.</li>
<li><strong>మచ్చలు</strong>: కోత పెట్టిన చోట మచ్చలు ఏర్పడతాయి. ఇవి శాశ్వతంగా ఉంటాయి.</li>
<li><strong>నొప్పి</strong>: ఆపరేషన్ తర్వాత నొప్పి ఉండటం సహజం. మందులతో తగ్గుతుంది, కానీ అరుదుగా ఎక్కువ కాలం ఉండొచ్చు.</li>
<li><strong>రక్తపు గడ్డలు</strong>: కాళ్ళలో రక్తం గడ్డకట్టే అవకాశం ఉంది (DVT). ఇది ఊపిరితిత్తులకు చేరితే ప్రమాదకరం (PE).</li>
<li><strong>గుండె/ఊపిరితిత్తుల సమస్యలు</strong>: ఆపరేషన్ ఒత్తిడి వల్ల అరుదుగా గుండెనొప్పి లేదా శ్వాస ఇబ్బందులు రావచ్చు.</li>
</ul>`,
                anesthesia: `<h2>మత్తు మందు (Anesthesia) ప్రమాదాలు</h2>
<ul>
<li><strong>ఎలర్జీలు</strong>: మత్తు మందుల వల్ల ఎలర్జీ వచ్చే అవకాశం ఉంది (అరుదుగా).</li>
<li><strong>వికారం/వాంతులు</strong>: స్పృహ వచ్చిన తర్వాత వాంతులు కావడం సాధారణం, ఇది త్వరగా తగ్గుతుంది.</li>
<li><strong>శ్వాస ఇబ్బంది</strong>: గొంతులో గొట్టం వేయడం వల్ల గొంతు నొప్పి లేదా శ్వాస తీసుకోవడంలో స్వల్ప ఇబ్బంది ఉండొచ్చు.</li>
<li><strong>నరాల బలహీనత</strong>: సూది వేసిన చోట నరం దెబ్బతిని స్పర్శ తగ్గడం లేదా బలహీనంగా అనిపించడం.</li>
<li><strong>స్పృహ</strong>: ఆపరేషన్ జరుగుతున్నప్పుడు తెలివి రావడం అనేది చాలా చాలా అరుదు.</li>
</ul>`,
                procedure_placeholder: `<h2>శస్త్రచికిత్స నిర్దిష్ట ప్రమాదాలు</h2>
<ul>
<li><strong>నరాల గాయం</strong>: ఆపరేషన్ చేసే ప్రాంతం చుట్టూ ఉన్న నరాలు దెబ్బతినే అవకాశం ఉంది.</li>
<li><strong>బిగుసుకుపోవడం</strong>: కీలు లేదా ఆపరేషన్ చేసిన భాగం బిగుసుకుపోవచ్చు.</li>
<li><strong>ఇంప్లాంట్ సమస్యలు</strong>: రాడ్లు లేదా ప్లేట్లు వేస్తే అవి భవిష్యత్తులో లూజ్ అవ్వొచ్చు లేదా విరిగిపోవచ్చు.</li>
<li><strong>పూర్తి ఉపశమనం</strong>: ఆపరేషన్ తర్వాత కూడా నొప్పి పూర్తిగా తగ్గకపోవచ్చు.</li>
<li><strong>మళ్ళీ ఆపరేషన్</strong>: భవిష్యత్తులో ఇదే సమస్యకు మళ్ళీ ఆపరేషన్ అవసరం రావచ్చు.</li>
</ul>`,
                declaration: (name: string, procedure: string) => `నేను, ${name}, ${procedure} శస్త్రచికిత్స గురించి, దాని లాభాలు, మరియు నష్టాల గురించి నాకు అర్థమయ్యే భాషలో డాక్టర్ గారు వివరించారని ధృవీకరిస్తున్నాను. పైన పేర్కొన్న ప్రమాదాలను నేను చదివాను (లేదా నాకు చదివి వినిపించారు). నాకు ఉన్న సందేహాలన్నీ అడిగి తెలుసుకున్నాను. నా పూర్తి ఇష్టపూర్వకంగా ఈ ఆపరేషన్ కు సమ్మతి తెలియజేస్తున్నాను.`
        }
};
