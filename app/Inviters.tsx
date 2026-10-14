export default function Inviters({ language }: { language: "gu" | "en" }) {
  const names = language === "gu"
    ? ["શ્રીમતી આશાબેન વસંતભાઈ પટેલ", "સ્વ. વસંતભાઈ શાંતિલાલ પટેલ"]
    : ["Ashaben Vasantbhai Patel", "Vasantbhai Shantilal Patel"];

  return (
    <section className="inviter-section section-wrap" id="inviters" aria-labelledby="inviter-title">
      <h2 id="inviter-title">{language === "gu" ? "નિમંત્રક" : "Invited by"}</h2>
      <div className="small-divider inviter-divider" aria-hidden="true">✦<span />✦</div>
      <div className="inviter-card">
        <p className="inviter-name">{names[0]}</p>
        <span className="inviter-amp">&amp;</span>
        <p className="inviter-name">{names[1]}</p>
      </div>
    </section>
  );
}
