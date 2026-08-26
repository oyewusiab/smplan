/**
 * Come, Follow Me Universal URL Parser, Live Web Scraper & Complete 52-Week Curriculum Engine
 * File: bulletinCfmParser.ts
 */

export interface ParsedCfmGuide {
  url: string;
  reading_block: string;
  study_theme: string;
  introduction: string;
  ideas_for_learning: string;
  reflection_options: string[];
  selected_reflection: string;
}

export function cleanHtml(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&rdquo;/g, '”')
    .replace(/&ldquo;/g, '“')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8217;/g, '’')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Complete 52-Week Comprehensive Curriculum Database for Old Testament 2026
 */
export const CFM_52_WEEKS: Record<string, {
  reading: string;
  theme: string;
  intro: string;
  ideas: string[];
  reflections: string[];
}> = {
  '1': {
    reading: 'Moses 1; Abraham 3',
    theme: 'December 29–January 4: “This Is My Work and My Glory”',
    intro: 'Before God created the earth, He revealed to Moses the vastness of His creations and the divine identity and purpose of each of His children. Knowing that we are children of God with eternal potential gives meaning and direction to our mortal experience.',
    ideas: [
      'Moses 1:1–11: I am a child of God with a divine work to do.',
      'Moses 1:12–22: I can resist Satan’s temptations through faith in Jesus Christ.',
      'Moses 1:39: God’s work and glory is to bring to pass our immortality and eternal life.',
      'Abraham 3:22–28: We were chosen in the premortal life to fulfill divine purposes on earth.',
    ],
    reflections: [
      'How does knowing you are a beloved child of God help you overcome discouragement and temptation? (Moses 1:4–6)',
      'What specific truths about the premortal council give you confidence in Heavenly Father’s plan? (Abraham 3:24–26)',
      'How can your daily actions align more closely with God’s work and glory? (Moses 1:39)',
    ],
  },
  '2': {
    reading: 'Genesis 1–2; Moses 2–3; Abraham 4–5',
    theme: 'January 5–11: “In the Beginning God Created the Heaven and the Earth”',
    intro: 'The Creation of the earth was not a random accident; it was planned and executed under Heavenly Father’s direction through Jesus Christ so that God’s children could have a place to progress, receive bodies, and make sacred covenants.',
    ideas: [
      'Genesis 1:26–28; Moses 2:26–28: We are created in the image of God with divine purpose.',
      'Genesis 2:1–3: The Sabbath is a holy day of spiritual rest and renewal.',
      'Genesis 2:18–25; Moses 3:18–25: Marriage between a man and a woman is ordained of God.',
      'Abraham 4–5: All things were created spiritually before they were naturally upon the earth.',
    ],
    reflections: [
      'How does recognizing God’s hand in creation inspire gratitude and reverence in your life? (Genesis 1:31)',
      'How can you make the Sabbath a delight and a sign of your devotion to the Lord? (Genesis 2:2–3)',
      'What can you do to honor the divine sanctity of marriage and family? (Genesis 2:24)',
    ],
  },
  '3': {
    reading: 'Genesis 3–4; Moses 4–5',
    theme: 'January 12–18: “The Fall of Adam and Eve”',
    intro: 'The Fall of Adam and Eve was an essential step in Heavenly Father’s plan of happiness. Through the Fall, mortal life began, and through the Atonement of Jesus Christ, all mankind can be redeemed from physical and spiritual death.',
    ideas: [
      'Moses 4:1–4: Jesus Christ was chosen from the beginning, while Lucifer sought to destroy agency.',
      'Moses 5:4–12: Adam and Eve offered sacrifices pointing to the Atonement of the Savior.',
      'Moses 5:10–11: Because of the Fall and Atonement, we can experience joy, redemption, and eternal life.',
      'Genesis 4:1–12; Moses 5:16–33: Obeying God’s commandments protects us from the destructive effects of sin.',
    ],
    reflections: [
      'Why is Adam and Eve’s transgression considered a necessary and forward step in God’s plan? (Moses 5:11)',
      'How has understanding the Savior’s Atonement given you hope and comfort after personal mistakes? (Moses 5:9)',
      'How can you safeguard your family against the adversary’s subtle deceptions? (Moses 4:4)',
    ],
  },
  '4': {
    reading: 'Genesis 5; Moses 6',
    theme: 'January 19–25: “Teach These Things Freely unto Your Children”',
    intro: 'Enoch felt inadequate when called to preach repentance, but the Lord promised to open his mouth and guide him. Through Enoch, God revealed the fundamental doctrine of the Gospel of Jesus Christ: faith, repentance, baptism, and receiving the Holy Ghost.',
    ideas: [
      'Moses 6:26–36: The Lord qualifies those whom He calls to do His work.',
      'Moses 6:51–62: We must teach our children the foundational doctrine of Christ freely.',
      'Moses 6:57–60: We are born again through water, the Spirit, and the blood of Christ.',
      'Moses 6:63: All things in heaven and earth bear record of Jesus Christ.',
    ],
    reflections: [
      'When you feel inadequate in your callings or duties, how does the Lord’s promise to Enoch reassure you? (Moses 6:32–34)',
      'How can you more intentionally teach the doctrine of Christ in your home? (Moses 6:58)',
      'In what ways does nature and the world around you testify of the Savior? (Moses 6:63)',
    ],
  },
  '5': {
    reading: 'Moses 7',
    theme: 'January 26–February 1: “The Lord Called His People Zion”',
    intro: 'Enoch led his people to become of one heart and one mind, dwelling in righteousness until there was no poor among them. Enoch saw in vision the God of heaven weeping over the wickedness of His children, showing God’s tender compassion.',
    ideas: [
      'Moses 7:18: Zion is established when we are of one heart and one mind with no poor among us.',
      'Moses 7:28–33, 41: God is a loving Father who feels deep sorrow for the suffering of His children.',
      'Moses 7:62–67: In the last days, the Lord will gather His elect and establish Zion once again.',
      'Moses 7:69: Enoch and his city were translated and taken up into heaven.',
    ],
    reflections: [
      'What can you do in your home and ward to help build a spirit of unity and love (Zion)? (Moses 7:18)',
      'How does seeing God weep for His children change your understanding of His divine character? (Moses 7:28–33)',
      'How can you participate in gathering Israel and preparing for the Second Coming? (Moses 7:62)',
    ],
  },
  '6': {
    reading: 'Genesis 6–11; Moses 8',
    theme: 'February 2–8: “Noah Found Grace in the Eyes of the Lord”',
    intro: 'In a world filled with violence and wickedness, Noah walked with God and faithfully warned the people. The ark was a vehicle of physical and spiritual salvation, just as following living prophets and making temple covenants is today.',
    ideas: [
      'Genesis 6:8–9; Moses 8:27: Noah was just and perfect in his generations and walked with God.',
      'Genesis 6:13–22: Following the prophet’s counsel provides safety and deliverance during spiritual storms.',
      'Genesis 9:12–17: The rainbow is a reminder of God’s eternal covenant of mercy and peace.',
      'Genesis 11:1–9: Pride leads to division and confusion, while humility unites us in Christ.',
    ],
    reflections: [
      'How does following the living prophet provide an "ark" of spiritual safety for your family? (Genesis 6:22)',
      'What covenants help you remember God’s promises when navigating life’s storms? (Genesis 9:16)',
      'How can you guard your heart against the pride of the Tower of Babel? (Genesis 11:4)',
    ],
  },
  '7': {
    reading: 'Genesis 12–17; Abraham 1–2',
    theme: 'February 9–15: “To Be a Greater Follower of Righteousness”',
    intro: 'Abraham sought the blessings of the fathers and desired to be a greater follower of righteousness. God made an everlasting covenant with Abraham, promising that through his seed all the families of the earth would be blessed with the gospel.',
    ideas: [
      'Abraham 1:1–4: We can seek greater righteousness and peace regardless of our family background.',
      'Genesis 12:1–3; Abraham 2:8–11: The Abrahamic covenant blesses all who receive the gospel and priesthood.',
      'Genesis 13:5–13: Seeking peace and avoiding contention brings the Lord’s blessings.',
      'Genesis 15:1–6; 17:1–8: Faith in God’s promises sustains us through long periods of waiting.',
    ],
    reflections: [
      'What steps can you take this week to become a "greater follower of righteousness"? (Abraham 1:2)',
      'How does receiving temple covenants connect you to the blessings of Abraham? (Abraham 2:11)',
      'How can you resolve contention peacefully in your home or relationships as Abraham did? (Genesis 13:8)',
    ],
  },
  '8': {
    reading: 'Genesis 18–23',
    theme: 'February 16–22: “Is Any Thing Too Hard for the Lord?”',
    intro: 'The Lord fulfilled His promise to Abraham and Sarah by blessing them with Isaac in their old age. Later, Abraham was asked to offer Isaac as a sacrifice—a similitude of God offering His Only Begotten Son.',
    ideas: [
      'Genesis 18:9–14: “Is any thing too hard for the Lord?” — Trusting God’s timing and miraculous power.',
      'Genesis 19:15–26: Fleeing temptation without looking back preserves our spiritual life.',
      'Genesis 21:1–7: God keeps His promises in His own time and way.',
      'Genesis 22:1–18: Abraham’s willingness to offer Isaac points us to Heavenly Father’s sacrifice of Jesus Christ.',
    ],
    reflections: [
      'How has the Lord demonstrated in your life that nothing is too hard for Him? (Genesis 18:14)',
      'What does it mean to you to "not look back" when leaving worldly habits behind? (Genesis 19:26)',
      'How does Abraham and Isaac’s experience deepen your gratitude for the Father and the Son? (Genesis 22:8)',
    ],
  },
  '9': {
    reading: 'Genesis 24–27',
    theme: 'February 23–March 1: “The Covenant of Abraham”',
    intro: 'Abraham’s servant prayed for guidance to find a covenant wife for Isaac, and Rebekah’s kindness and willingness were recognized. The birthright blessings continued through Jacob, demonstrating the paramount value of covenant heritage.',
    ideas: [
      'Genesis 24:1–28: Seeking the Lord’s guidance in marriage and family decisions invites divine help.',
      'Genesis 24:58: Rebekah’s faithful response “I will go” shows courageous obedience.',
      'Genesis 25:29–34: We must never trade eternal birthright blessings for temporary worldly gratification.',
      'Genesis 26:1–5: The Lord renews His covenant with those who walk in righteousness.',
    ],
    reflections: [
      'How can you seek the Lord’s guidance in major family and relationship decisions? (Genesis 24:12)',
      'What worldly distractions tempt us to sell our spiritual birthright, and how can we choose what matters most? (Genesis 25:34)',
      'How does Rebekah’s example of prompt service inspire your ministering? (Genesis 24:18–20)',
    ],
  },
  '10': {
    reading: 'Genesis 28–33',
    theme: 'March 2–8: “Surely the Lord Is in This Place”',
    intro: 'While traveling, Jacob dreamed of a ladder reaching from earth to heaven and received the promises of the Abrahamic covenant. After years of labor with Laban and wrestling with God in prayer, Jacob was reconciled with his brother Esau.',
    ideas: [
      'Genesis 28:10–22: The temple is the house of God and gate of heaven where we connect with eternity.',
      'Genesis 32:24–30: Earnest prayer and wrestling for spiritual blessings transforms our nature.',
      'Genesis 32:28: Jacob’s name was changed to Israel, meaning “let God prevail.”',
      'Genesis 33:1–11: Forgiving others and seeking reconciliation heals broken family relationships.',
    ],
    reflections: [
      'How does worship in the temple become your "Bethel" — a place where you feel God’s presence? (Genesis 28:16–17)',
      'What does it mean to you to allow God to prevail in your daily choices? (Genesis 32:28)',
      'How can you take the initiative to bring healing or forgiveness to an estranged relationship? (Genesis 33:4)',
    ],
  },
  '11': {
    reading: 'Genesis 37–41',
    theme: 'March 9–15: “The Lord Was with Joseph”',
    intro: 'Joseph was sold into Egypt by his brothers and falsely imprisoned in Potiphar’s house, but in every circumstance “the Lord was with Joseph.” Through integrity and divine revelation, Joseph interpreted Pharaoh’s dreams and was exalted to save nations.',
    ideas: [
      'Genesis 37:1–28: Envy and bitterness harm families, while patience under trial builds character.',
      'Genesis 39:1–9: In times of temptation, we can stand firm with Joseph: “How then can I do this great wickedness, and sin against God?”',
      'Genesis 39:21–23: Even in our darkest prisons, the Lord will not abandon us.',
      'Genesis 41:14–44: The Lord prepares and exalts the humble to accomplish His saving work.',
    ],
    reflections: [
      'When facing moral temptation, how can you draw upon Joseph’s strength to flee? (Genesis 39:9)',
      'How have you felt the Lord’s comforting presence during times of unfair treatment or hardship? (Genesis 39:21)',
      'How can you develop your spiritual gifts to bless your community and ward? (Genesis 41:16)',
    ],
  },
  '12': {
    reading: 'Genesis 42–50',
    theme: 'March 16–22: “God Meant It unto Good”',
    intro: 'When famine brought Joseph’s brothers to Egypt, Joseph forgave them with tears of compassion, testifying that God had preserved him to save lives. Jacob blessed his sons, foretelling the destiny of the house of Israel and the mission of Joseph Smith in the last days.',
    ideas: [
      'Genesis 45:1–8: Forgiveness frees our souls and allows God’s healing power to mend past wounds.',
      'Genesis 50:20: “Ye thought evil against me; but God meant it unto good” — God turns adversity into blessing.',
      'Genesis 49; JST Genesis 50:24–38: Prophecies of the latter-day seer Joseph Smith and the restoration.',
      'Genesis 50:15–21: True repentance and heartfelt reconciliation bring everlasting peace.',
    ],
    reflections: [
      'How has God turned a past difficulty in your life into something that brought good? (Genesis 50:20)',
      'What steps can you take to extend genuine forgiveness to those who have wronged you? (Genesis 45:5)',
      'How does Joseph’s testimony of Jesus Christ and the Restoration strengthen your faith? (JST Genesis 50:26)',
    ],
  },
  '13': {
    reading: 'Easter',
    theme: 'March 23–29: “He Will Swallow Up Death in Victory”',
    intro: 'Easter is the celebration of the Resurrection of Jesus Christ. Through His suffering in Gethsemane and victory over the grave on the cross and empty tomb, the Savior broke the bands of death and made forgiveness, healing, and immortality available to all.',
    ideas: [
      'Isaiah 25:8–9: He will swallow up death in victory, and the Lord God will wipe away tears.',
      'Luke 24:1–35: “Why seek ye the living among the dead? He is not here, but is risen.”',
      'Alma 7:11–13: The Savior took upon Himself our pains, sicknesses, and sins that He might succor us.',
      '1 Corinthians 15:20–22: “For as in Adam all die, even so in Christ shall all be made alive.”',
    ],
    reflections: [
      'What does the living reality of the resurrected Savior mean to you personally? (Luke 24:34)',
      'How has the Savior’s power to heal and succor sustained you through grief or pain? (Alma 7:12)',
      'How can your family make Easter a spiritually reverent and joyful celebration of Christ? (1 Corinthians 15:55–57)',
    ],
  },
  '14': {
    reading: 'Exodus 1–6',
    theme: 'March 30–April 5: “I Have Remembered My Covenant”',
    intro: 'When Israel groaned in Egyptian bondage, God heard their cry and remembered His covenant. The Lord called Moses at the burning bush and revealed His sacred name: “I AM THAT I AM.”',
    ideas: [
      'Exodus 1:15–22; 2:1–10: Faithful women like Shiprah, Puah, Jochebed, and Miriam preserved life with courage.',
      'Exodus 3:1–6: Holy ground is found where the Lord’s presence is reverenced.',
      'Exodus 3:11–14; 4:10–16: God strengthens those who feel inadequate in His service.',
      'Exodus 6:1–8: The Lord will redeem His people with an outstretched arm.',
    ],
    reflections: [
      'How has God answered your prayers when you felt in bondage to worry or trials? (Exodus 3:7)',
      'How can you create "holy ground" in your home through sacred worship? (Exodus 3:5)',
      'When called to difficult tasks, how do you rely on the Lord’s promise: "Certainly I will be with thee"? (Exodus 3:12)',
    ],
  },
  '15': {
    reading: 'Exodus 7–13',
    theme: 'April 6–12: “Remember This Day”',
    intro: 'Through signs, wonders, and the Passover, the Lord delivered Israel from Egyptian captivity. The blood of the unblemished lamb on the doorposts was a profound token of the Atoning blood of Jesus Christ that saves us from spiritual death.',
    ideas: [
      'Exodus 7–11: Hardening our hearts against the Lord brings spiritual destruction.',
      'Exodus 12:1–14: The Passover lamb without blemish is a type of Jesus Christ, the Lamb of God.',
      'Exodus 12:21–28: Faithfully following the Lord’s ordinances brings spiritual protection to families.',
      'Exodus 13:3, 14–16: We must remember and teach our children the Lord’s mighty deliverance.',
    ],
    reflections: [
      'How does partaking of the Sacrament each week relate to the ancient Passover ordinance? (Exodus 12:14)',
      'How does the Savior’s atoning blood protect your household from the adversary’s attacks? (Exodus 12:13)',
      'What traditions in your home help you "remember this day" and pass down your testimony? (Exodus 13:8)',
    ],
  },
  '16': {
    reading: 'Exodus 14–17',
    theme: 'April 13–19: “Stand Still, and See the Salvation of the Lord”',
    intro: 'Trapped between Pharaoh’s army and the Red Sea, Israel feared, but Moses urged them to “stand still, and see the salvation of the Lord.” God parted the sea, rained manna from heaven, and brought water from the rock, teaching Israel daily reliance upon Him.',
    ideas: [
      'Exodus 14:10–14: In moments of panic, we can find peace by trusting the Lord to fight our battles.',
      'Exodus 14:21–31: The Lord makes a way through seemingly impassable obstacles.',
      'Exodus 16:1–21: Daily manna reminds us to seek daily spiritual nourishment through Christ, the Bread of Life.',
      'Exodus 17:8–13: Sustaining our leaders’ hands invites the Lord’s power to prevail.',
    ],
    reflections: [
      'When facing situations where you see no way forward, how has the Lord parted the "Red Sea" for you? (Exodus 14:13)',
      'How do you ensure you gather fresh spiritual "manna" every day? (Exodus 16:16)',
      'How can you actively support and hold up the hands of your local and general church leaders? (Exodus 17:12)',
    ],
  },
  '17': {
    reading: 'Exodus 18–20',
    theme: 'April 20–26: “All That the Lord Hath Spoken We Will Do”',
    intro: 'Jethro taught Moses the vital principle of delegation to prevent burnout. At Mount Sinai, the Lord invited Israel to become a kingdom of priests and a holy nation, giving them the Ten Commandments as foundational laws of covenant discipleship.',
    ideas: [
      'Exodus 18:13–26: Counsel and delegation in church callings and family life bring strength and relief.',
      'Exodus 19:3–6: If we obey God’s voice and keep His covenant, we become a peculiar treasure unto Him.',
      'Exodus 20:1–17: The Ten Commandments teach us our duty to God and our duty to our fellow men.',
      'Exodus 20:8–11: Keeping the Sabbath day holy reflects our love for the Creator and Redeemer.',
    ],
    reflections: [
      'What can you do to keep God first in your life and avoid modern forms of idolatry? (Exodus 20:3–4)',
      'How does keeping the Ten Commandments bring greater freedom and peace to your family? (Exodus 20:1–17)',
      'How can leaders and parents effectively share responsibilities to avoid exhaustion? (Exodus 18:18)',
    ],
  },
  '18': {
    reading: 'Exodus 24; 31–34',
    theme: 'April 27–May 3: “The Lord, the Lord God, Merciful and Gracious”',
    intro: 'While Moses was on the mount receiving the law, Israel made a golden calf. Yet when Moses interceded, the Lord revealed His true character: merciful, gracious, long-suffering, and abundant in goodness and truth.',
    ideas: [
      'Exodus 24:3–8: Covenants are sealed by our sacred commitment to obey God’s word.',
      'Exodus 32:1–8: Worldly impatience and seeking visible idols quickly turns hearts away from God.',
      'Exodus 33:11–14: The Lord speaks with His servants as a man speaketh unto his friend.',
      'Exodus 34:5–7: Heavenly Father is merciful, forgiving iniquity, and keeping mercy for thousands.',
    ],
    reflections: [
      'How does understanding God’s merciful nature encourage you to return to Him when you fall short? (Exodus 34:6)',
      'What modern "golden calves" distract people today from worshipping the true and living God? (Exodus 32:4)',
      'How can you cultivate a friendship with God in your personal prayers? (Exodus 33:11)',
    ],
  },
  '19': {
    reading: 'Exodus 35–40; Leviticus 1; 16; 19',
    theme: 'May 4–10: “Holiness to the Lord”',
    intro: 'Israel willingly consecrated their talents and goods to build the tabernacle in the wilderness, so that the Lord might dwell among them. Through sacred sacrifices and the Day of Atonement, the law of Moses pointed to holiness through Jesus Christ.',
    ideas: [
      'Exodus 35:20–29: Giving with a willing heart allows the Lord’s work and temples to be built.',
      'Exodus 40:34–38: The glory of the Lord fills the temple when built according to His pattern.',
      'Leviticus 16: Day of Atonement sacrifices symbolize how Christ cleanses us from all unrighteousness.',
      'Leviticus 19:1–2, 18: “Ye shall be holy: for I the Lord your God am holy” — love thy neighbour as thyself.',
    ],
    reflections: [
      'What offerings of time, talents, or means can you bring to the Lord with a willing heart? (Exodus 35:21)',
      'How does temple worship bring the Lord’s presence into the center of your life? (Exodus 40:34)',
      'What does it mean in your daily life to "love thy neighbour as thyself"? (Leviticus 19:18)',
    ],
  },
  '20': {
    reading: 'Numbers 11–14; 20–24',
    theme: 'May 11–17: “Rebel Not Ye against the Lord, Neither Fear”',
    intro: 'While ten spies brought back a fearful report of giants in Canaan, Joshua and Caleb had “another spirit” and trusted that the Lord would bring them into the promised land. When poisonous serpents bit the camp, looking upon the bronze serpent brought healing.',
    ideas: [
      'Numbers 11:1–6, 26–29: Murmuring leads to spiritual blindness, while desiring all people to have God’s Spirit brings joy.',
      'Numbers 13:26–33; 14:6–9: Caleb and Joshua’s faithful courage: “If the Lord delight in us, then he will bring us into this land.”',
      'Numbers 21:4–9: Looking to Jesus Christ brings healing and eternal life (see Alma 33:19–22).',
      'Numbers 22–24: Balaam learned that no earthly reward can overturn the word of God.',
    ],
    reflections: [
      'How can you cultivate "another spirit" like Joshua and Caleb when facing intimidating worldly challenges? (Numbers 14:24)',
      'How can you "look and live" by turning your eyes toward the Savior during times of difficulty? (Numbers 21:8)',
      'What can you do to replace complaining and murmuring with genuine gratitude? (Numbers 11:1)',
    ],
  },
  '21': {
    reading: 'Deuteronomy 6–8; 15; 18; 29–30; 34',
    theme: 'May 18–24: “Beware Lest Thou Forget the Lord”',
    intro: 'Moses delivered his final sermons to Israel on the plains of Moab, pleading with them to love God with all their heart, soul, and might. He warned them that prosperity can lead to forgetfulness, and challenged them to choose life by loving the Lord.',
    ideas: [
      'Deuteronomy 6:4–9: Love the Lord with all thy heart, and teach His words diligently to your children.',
      'Deuteronomy 8:1–18: Beware that when you are prosperous, you do not forget the Lord who blessed you.',
      'Deuteronomy 18:15–18: The Lord promised to raise up a Prophet like unto Moses—Jesus Christ.',
      'Deuteronomy 30:15–20: “I have set before you life and death... therefore choose life.”',
    ],
    reflections: [
      'How do you keep God’s commandments written upon your heart throughout a busy day? (Deuteronomy 6:6)',
      'In times of abundance, what safeguards keep you humble and grateful to God? (Deuteronomy 8:17–18)',
      'What daily decisions help you actively "choose life" and cling unto the Savior? (Deuteronomy 30:19–20)',
    ],
  },
  '22': {
    reading: 'Joshua 1–8; 23–24',
    theme: 'May 25–31: “Be Strong and of a Good Courage”',
    intro: 'Joshua took command of Israel with the divine mandate: “Be strong and of a good courage; be not afraid, neither be thou dismayed: for the Lord thy God is with thee.” Israel crossed the Jordan, conquered Jericho, and covenanted to serve the Lord.',
    ideas: [
      'Joshua 1:1–9: Meditating day and night on the scriptures brings prosperity and good courage.',
      'Joshua 3–4: Stepping in faith into the waters of Jordan invites the Lord to perform wonders.',
      'Joshua 6: The walls of Jericho fell through faith and strict obedience to the Lord’s directions.',
      'Joshua 24:14–15: “Choose you this day whom ye will serve; but as for me and my house, we will serve the Lord.”',
    ],
    reflections: [
      'When entering new seasons of leadership or change, how do you find courage in the Lord? (Joshua 1:9)',
      'What "Jordan rivers" are you being asked to step into before the path becomes completely dry? (Joshua 3:13)',
      'How does your family uphold Joshua’s declaration to serve the Lord? (Joshua 24:15)',
    ],
  },
  '23': {
    reading: 'Judges 2–4; 6–8; 13–16',
    theme: 'June 1–7: “The Lord Raised Up a Deliverer”',
    intro: 'During the era of the Judges, Israel cycled through apostasy, oppression, repentance, and deliverance. The Lord raised up Deborah, Gideon, and Samson, demonstrating that God can deliver through the few and the humble.',
    ideas: [
      'Judges 2:10–19: The dangerous cycle of forgetting the Lord and the need for continual discipleship.',
      'Judges 4:4–14: Deborah’s faithful leadership inspired Barak and brought deliverance to Israel.',
      'Judges 6–7: Gideon’s army of 300 proved that the Lord saves by His power, not by worldly numbers.',
      'Judges 16: Samson lost his strength when he compromised his sacred Nazarite covenants.',
    ],
    reflections: [
      'How can you prevent the "cycle of apostasy" in your own spiritual journey? (Judges 2:10)',
      'How has the Lord shown you that with His help, a small or humble effort can achieve great things? (Judges 7:7)',
      'How do you protect the sacred covenants that give you spiritual strength? (Judges 16:20)',
    ],
  },
  '24': {
    reading: 'Ruth; 1 Samuel 1–3',
    theme: 'June 8–14: “My Heart Rejoiceth in the Lord”',
    intro: 'Ruth showed extraordinary loyalty to Naomi and the God of Israel, declaring, “Thy people shall be my people, and thy God my God.” Hannah poured out her soul in prayer for a son, dedicating Samuel to the temple, where the child learned to hear the Lord’s voice.',
    ideas: [
      'Ruth 1–4: Lovingkindness and covenant loyalty bring redemption and ancestral blessings in Christ’s lineage.',
      '1 Samuel 1:9–28: Pouring out our heart to the Lord in sorrow turns tears into praise.',
      '1 Samuel 2:1–10: Hannah’s song of rejoicing praises God who raises the poor and exalts the humble.',
      '1 Samuel 3:1–10: Learning to recognize and respond to the voice of God: “Speak, Lord; for thy servant heareth.”',
    ],
    reflections: [
      'How can you show covenant loyalty and Christlike devotion to your family and friends? (Ruth 1:16)',
      'How has sincere, tearful prayer helped you give your burdens to the Lord as Hannah did? (1 Samuel 1:15)',
      'What practices help you hear and obey the promptings of the Holy Ghost? (1 Samuel 3:9)',
    ],
  },
  '25': {
    reading: '1 Samuel 8–10; 13; 15–18',
    theme: 'June 15–21: “The Lord Looketh on the Heart”',
    intro: 'Israel demanded an earthly king, and Saul began well but fell through pride and partial obedience. When Samuel anointed the young shepherd David, the Lord revealed His eternal metric: man looketh on the outward appearance, but the Lord looketh on the heart.',
    ideas: [
      '1 Samuel 15:22: “To obey is better than sacrifice, and to hearken than the fat of rams.”',
      '1 Samuel 16:1–13: The Lord chooses and prepares His servants according to their inner integrity.',
      '1 Samuel 17:32–51: David faced Goliath with courage, trusting not in armor, but in the name of the Lord of Hosts.',
      '1 Samuel 18:1–4: Jonathan and David’s pure friendship was bonded in covenant love.',
    ],
    reflections: [
      'How can you focus more on cultivating inner purity rather than seeking worldly recognition? (1 Samuel 16:7)',
      'What "Goliaths" are challenging your faith today, and how do you confront them in the name of the Lord? (1 Samuel 17:45)',
      'How does complete obedience differ from convenient or partial obedience? (1 Samuel 15:22)',
    ],
  },
  '26': {
    reading: '2 Samuel 5–7; 11–12; 1 Kings 3; 8; 11',
    theme: 'June 22–28: “Thy Kingdom Shall Be Established for Ever”',
    intro: 'David unified Israel and brought the ark to Jerusalem, but his tragic fall with Bathsheba brought lifelong sorrow. Solomon prayed for an understanding heart to judge God’s people and built the magnificent temple in Jerusalem.',
    ideas: [
      '2 Samuel 7:1–16: The Lord’s covenant with David points to Jesus Christ, the eternal King.',
      '2 Samuel 11–12: The dangerous trap of idle lingering where temptation resides leads to devastating sins.',
      '1 Kings 3:5–14: Seeking wisdom and an understanding heart to bless others pleases the Lord.',
      '1 Kings 8:22–53: Solomon’s dedicatory prayer shows how the temple connects heaven and earth.',
    ],
    reflections: [
      'What boundaries can you establish to protect yourself from compromising situations? (2 Samuel 11:1–2)',
      'If the Lord asked what gift you desire most, what would you ask for to bless others? (1 Kings 3:9)',
      'How does regular temple worship keep your heart centered on the Lord’s kingdom? (1 Kings 8:29)',
    ],
  },
  '27': {
    reading: '1 Kings 17–19',
    theme: 'June 29–July 5: “If the Lord Be God, Follow Him”',
    intro: 'During a time of severe drought and Baal worship, Elijah was sustained by the widow of Zarephath. On Mount Carmel, Elijah challenged the priests of Baal, and later at Mount Horeb, he learned that the Lord speaks not in the wind or earthquake, but in a still small voice.',
    ideas: [
      '1 Kings 17:8–24: Putting the Lord first in our offerings brings spiritual and physical sustenance.',
      '1 Kings 18:21: “How long halt ye between two opinions? if the Lord be God, follow him.”',
      '1 Kings 18:36–39: The fire of the Lord consumes the sacrifice, confirming the true and living God.',
      '1 Kings 19:11–13: The Holy Ghost speaks to us through a still, small voice.',
    ],
    reflections: [
      'How has trusting the Lord with your tithes and offerings blessed your family during lean times? (1 Kings 17:13–15)',
      'Where in your life are you being called to make a full, undivided commitment to Christ? (1 Kings 18:21)',
      'How do you quiet worldly noise to hear the whisper of the "still small voice"? (1 Kings 19:12)',
    ],
  },
  '28': {
    reading: '2 Kings 2–7',
    theme: 'July 6–12: “There Is a Prophet in Israel”',
    intro: 'Elijah was taken up into heaven, and Elisha received a double portion of his spirit. Elisha healed the bitter waters, multiplied the widow’s oil, raised the Shunammite’s son, and taught Naaman that simple acts of obedience bring miraculous healing.',
    ideas: [
      '2 Kings 2:9–15: Seeking a double portion of the Spirit prepares us to fulfill our stewardships.',
      '2 Kings 4:1–7: The Lord multiplies our small capacities when we bring all we have to Him.',
      '2 Kings 5:1–14: Washing in the Jordan: Simple acts of obedience bring mighty spiritual healing.',
      '2 Kings 6:15–17: “Fear not: for they that be with us are more than they that be with them.”',
    ],
    reflections: [
      'How can simple, daily spiritual habits (prayer, scripture study) bring great healing to your soul? (2 Kings 5:13)',
      'When feeling outnumbered by worldly influences, how does knowing angels surround you bring peace? (2 Kings 6:16)',
      'How can you show faith that the Lord will multiply your humble resources? (2 Kings 4:2)',
    ],
  },
  '29': {
    reading: '2 Kings 17–25',
    theme: 'July 13–19: “He Trusted in the Lord God of Israel”',
    intro: 'The northern kingdom of Israel fell into captivity due to idolatry, while righteous kings Hezekiah and Josiah led spiritual renewals in Judah. When Assyria threatened Jerusalem, Hezekiah spread the enemy’s letter before the Lord in the temple and was delivered.',
    ideas: [
      '2 Kings 17:7–23: Rationalizing disobedience and following worldly trends leads to spiritual bondage.',
      '2 Kings 18:5–7: Hezekiah trusted in the Lord and cleaved unto Him, and the Lord prospered him.',
      '2 Kings 19:14–19: Taking our anxieties and fears into the temple brings divine deliverance.',
      '2 Kings 22–23: Josiah rediscovered the lost book of the law and led the people in renewing their covenants.',
    ],
    reflections: [
      'How do you take your deepest worries directly to Heavenly Father in prayer and temple worship? (2 Kings 19:14)',
      'How has reading and rediscovering the scriptures renewed your desire to keep God’s covenants? (2 Kings 23:2–3)',
      'What can you do to "cleave unto the Lord" when societal standards are shifting? (2 Kings 18:6)',
    ],
  },
  '30': {
    reading: '2 Chronicles 20; 26; 29–30; 32; 34',
    theme: 'July 20–26: “The Lord Is with You, While Ye Be with Him”',
    intro: 'When facing immense armies, King Jehoshaphat proclaimed a fast and declared: “We have no might against this great company; neither know we what to do: but our eyes are upon thee.” The chronicles emphasize that the battle is not ours, but God’s.',
    ideas: [
      '2 Chronicles 20:1–12: “Our eyes are upon thee” — turning our gaze toward God when overwhelmed.',
      '2 Chronicles 20:15–17: “The battle is not yours, but God’s” — standing still to see the Lord’s deliverance.',
      '2 Chronicles 20:20: “Believe in the Lord your God, so shall ye be established; believe his prophets, so shall ye prosper.”',
      '2 Chronicles 30:6–9: Returning to the Lord with full purpose of heart brings His tender mercy.',
    ],
    reflections: [
      'When you do not know what to do in complex trials, how does keeping your eyes upon God bring peace? (2 Chronicles 20:12)',
      'How does trusting the words of living prophets bring spiritual prosperity to your home? (2 Chronicles 20:20)',
      'How has the Lord fought battles for you when you placed your faith entirely in Him? (2 Chronicles 20:15)',
    ],
  },
  '31': {
    reading: 'Ezra 1; 3–7; Nehemiah 2; 4–6; 8',
    theme: 'July 27–August 2: “I Am Doing a Great Work”',
    intro: 'After years in Babylonian captivity, the Jews were permitted to return to Jerusalem and rebuild the temple and city walls. Despite facing intense opposition and mockery from enemies, they united and declared with courage, “I am doing a great work, so that I cannot come down.”',
    ideas: [
      'Ezra 1; 3: The Lord inspires leaders and individuals to restore His holy house and true worship.',
      'Nehemiah 2:17–20; 4; 6: When doing the Lord’s work, we must not be distracted or discouraged by opposition.',
      'Nehemiah 8: Reading and understanding the scriptures brings spiritual renewal and profound joy.',
      'Ezra 7:10: Preparing our hearts to seek the law of the Lord enables us to teach and bless others.',
    ],
    reflections: [
      'What distractions or opposition are trying to pull you away from your "great work" of discipleship, and how can you stand firm? (Nehemiah 6:3)',
      'How has gathering to study the scriptures brought greater joy and unity into your home? (Nehemiah 8:8–12)',
      'In what ways can you actively contribute to building up the Lord’s kingdom in your ward or branch? (Ezra 3:10–11)',
    ],
  },
  '32': {
    reading: 'Esther',
    theme: 'August 3–9: “Thou Art Come to the Kingdom for Such a Time as This”',
    intro: 'The story of Queen Esther demonstrates that the Lord places His faithful children in specific places and times to accomplish His purposes. Through fasting, courage, and faith in God, Esther risked her life to save her people from destruction.',
    ideas: [
      'Esther 3; 4:10–17: The Lord places us in circumstances where we can be instruments of deliverance and righteousness.',
      'Esther 4:15–16: Fasting, prayer, and faith invite the Lord’s power and protection in moments of trial.',
      'Esther 5; 7; 8: Standing up for truth with wisdom and humility can change hearts and bless generations.',
      'Esther 4:14: God’s deliverance will always prevail as we do our part with valiant courage.',
    ],
    reflections: [
      'For what divine purposes might the Lord have brought you to your current family, calling, or community "for such a time as this"? (Esther 4:14)',
      'How has united fasting and prayer strengthened you when facing intimidating decisions? (Esther 4:16)',
      'What gives you courage to stand for your standards when it is unpopular? (Esther 7:3–4)',
    ],
  },
  '33': {
    reading: 'Job 1–3; 12–14; 19; 21–24; 38–40; 42',
    theme: 'August 10–16: “Yet Will I Trust in Him”',
    intro: 'Job was a righteous man who suffered unimaginable losses of family, health, and wealth. Despite deep grief and confusing questions, Job anchored his soul to the eternal truth that his Redeemer lives and that trials in mortality do not mean God has abandoned us.',
    ideas: [
      'Job 1:20–22; 2:9–10: Righteousness does not guarantee a life free of sorrow, but faith sustains us in grief.',
      'Job 13:15; 19:25–27: “I know that my Redeemer liveth” — our testimony of Jesus Christ transcends mortal pain.',
      'Job 38; 40; 42: God’s perspective and eternal wisdom surpass our limited mortal understanding.',
      'Job 42:10–12: As we remain faithful and pray for others during our trials, the Lord brings peace and restoration.',
    ],
    reflections: [
      'How has your testimony that your Redeemer lives provided comfort when answers to difficult questions are not immediate? (Job 19:25)',
      'What practices help you maintain faith and trust in Heavenly Father during sudden or painful adversity? (Job 13:15)',
      'How does contemplating God’s majesty and creation help you put personal challenges in perspective? (Job 38:4–7)',
    ],
  },
  '34': {
    reading: 'Psalms 1–2; 8; 19–33; 40; 46',
    theme: 'August 17–23: “The Lord Is My Shepherd”',
    intro: 'The early Psalms are songs of worship, confidence, and reverence for the Lord as our Shepherd, Rock, and Refuge. Through their poetic expressions, we learn that meditating upon God’s law and trusting in His mercy brings enduring peace even amidst worldly turbulence.',
    ideas: [
      'Psalm 1; 19: Delighting in and meditating on the word of the Lord brings spiritual vitality and strength.',
      'Psalm 23: The Lord is our loving Shepherd who restores our soul and leads us through the valley of the shadow of death.',
      'Psalm 24: Having clean hands and a pure heart prepares us to enter the presence of the Lord and His holy house.',
      'Psalm 46: “Be still, and know that I am God” — finding quiet refuge in the Lord amidst life’s storms.',
    ],
    reflections: [
      'In what ways has the Good Shepherd guided, restored, or comforted you during difficult times in your life? (Psalm 23:1–4)',
      'What daily habits help you cultivate "clean hands and a pure heart" as you worship in the Lord\'s temple? (Psalm 24:3–4)',
      'How do you create sacred moments of stillness to hear the voice of the Lord? (Psalm 46:10)',
    ],
  },
  '35': {
    reading: 'Psalms 49–51; 61–66; 69–72; 77–78; 85–86',
    theme: 'August 24–30: “I Will Declare What He Hath Done for My Soul”',
    intro: 'The writers of the Psalms openly expressed raw human emotions, ranging from deep despair and abandonment to powerful praise and gratitude. Ultimately, their poetry demonstrates that having faith does not eliminate personal struggles, but rather provides a clear blueprint for where to turn for comfort and forgiveness.',
    ideas: [
      'Psalms 49; 62:5–12: Redemption comes only through Jesus Christ.',
      'Psalms 51; 85–86: Because of the Savior’s mercy, I can be forgiven.',
      'Psalms 51:13–15; 66:5–20; 71:15–24: My testimony of Jesus Christ can help others come unto Him.',
      'Psalms 63; 69; 77–78: The Lord will help me in my time of need.',
    ],
    reflections: [
      'How has crying unto the Lord in humility helped you find peace and forgiveness through the Savior’s mercy? (Psalm 51)',
      'In what ways has remembering the works of the Lord in your past strengthened your trust in Him during present trials? (Psalm 77:11)',
      'What has the Savior done for your soul that you feel inspired to declare and share with others? (Psalm 66:16)',
    ],
  },
  '36': {
    reading: 'Psalms 102–103; 110; 116–119; 127–128; 135–139; 146–150',
    theme: 'August 31–September 6: “Let Every Thing That Hath Breath Praise the Lord”',
    intro: 'These concluding Psalms are filled with vibrant expressions of praise, thanksgiving, and gratitude for God’s intimate awareness of our lives. They celebrate how God’s word serves as a lamp unto our feet and how His tender mercies are over all His creations.',
    ideas: [
      'Psalm 103: Remembering all the Lord’s benefits, forgiveness, and lovingkindness fills our hearts with gratitude.',
      'Psalm 119: God’s word and commandments are a lamp unto our feet and a light unto our path.',
      'Psalm 127: “Except the Lord build the house, they labour in vain” — putting Christ at the center of family life.',
      'Psalm 139: Heavenly Father knows us intimately and loves us completely wherever we go.',
    ],
    reflections: [
      'How has scripture study functioned as a "lamp unto your feet" when making important decisions? (Psalm 119:105)',
      'What does it mean to you that the Lord knows your thoughts and is acquainted with all your ways? (Psalm 139:1–4)',
      'What blessings of the Lord are you most inspired to praise Him for this week? (Psalm 103:1–5)',
    ],
  },
  '37': {
    reading: 'Proverbs 1–4; 15–16; 22; 31; Ecclesiastes 1–3; 11–12',
    theme: 'September 7–13: “Trust in the Lord with All Thine Heart”',
    intro: 'Proverbs and Ecclesiastes offer practical wisdom for living a godly and meaningful life. They teach that true wisdom begins with revering the Lord and choosing righteousness over the fleeting pursuits of worldly gain.',
    ideas: [
      'Proverbs 3:5–6: Trust in the Lord with all thine heart, and lean not unto thine own understanding.',
      'Proverbs 15:1; 16:32: A soft answer turneth away wrath, and controlling our spirit brings peace.',
      'Proverbs 22:6: Train up a child in the way he should go, and when he is old, he will not depart from it.',
      'Ecclesiastes 3:1–8; 12:13–14: There is a season for every purpose under heaven; fear God and keep His commandments.',
    ],
    reflections: [
      'How has trusting the Lord instead of your own understanding directed your paths? (Proverbs 3:5–6)',
      'How can responding with a "soft answer" de-escalate tension in your family or work environment? (Proverbs 15:1)',
      'What eternal priorities should guide your daily use of time in this season of your life? (Ecclesiastes 3:1)',
    ],
  },
  '38': {
    reading: 'Isaiah 1–12',
    theme: 'September 14–20: “Though Your Sins Be as Scarlet”',
    intro: 'The prophet Isaiah called ancient Israel to repentance with vivid, urgent imagery, while testifying of the Redeemer. He taught that even when we feel spiritually weary or burdened by sin, Jesus Christ offers profound cleansing: "though your sins be as scarlet, they shall be as white as snow."',
    ideas: [
      'Isaiah 1:16–18: Through Jesus Christ, I can be forgiven and cleansed from sin.',
      'Isaiah 2:1–5: The temple is the mountain of the Lord where He teaches us His ways.',
      'Isaiah 6:1–8: When called by God, I can respond with faith: “Here am I; send me.”',
      'Isaiah 7:14; 9:6–7: Jesus Christ is Emmanuel, the Prince of Peace and eternal Counselor.',
    ],
    reflections: [
      'How does the Savior’s promise to make scarlet sins "white as snow" give you hope and courage to repent daily? (Isaiah 1:18)',
      'How does worship in the temple help you walk in the paths of the Lord during challenging times? (Isaiah 2:3)',
      'When the Lord extends callings or opportunities to minister, how can you respond with Isaiah\'s faith: "Here am I; send me"? (Isaiah 6:8)',
    ],
  },
  '39': {
    reading: 'Isaiah 13–14; 24–30; 35',
    theme: 'September 21–27: “A Marvelous Work and a Wonder”',
    intro: 'Isaiah foresaw the apostasy and confusion of the world, but also the glorious Restoration of the gospel in the latter days. The Lord promised to perform a marvelous work and a wonder, bringing forth sacred scripture from the dust.',
    ideas: [
      'Isaiah 25:8–9: He will swallow up death in victory, and wipe away tears from off all faces.',
      'Isaiah 28:16: Jesus Christ is our sure foundation, a precious corner stone.',
      'Isaiah 29:13–14, 18–19: The Book of Mormon and Restoration of the gospel is a marvelous work and a wonder.',
      'Isaiah 35:3–10: The ransomed of the Lord shall return with songs and everlasting joy.',
    ],
    reflections: [
      'How is the Restoration of the gospel a "marvelous work and a wonder" in your personal life? (Isaiah 29:14)',
      'How can you build your daily spiritual foundation upon the sure cornerstone of Jesus Christ? (Isaiah 28:16)',
      'What brings you comfort knowing the Savior will one day wipe away all tears? (Isaiah 25:8)',
    ],
  },
  '40': {
    reading: 'Isaiah 40–49',
    theme: 'September 28–October 4: “Comfort Ye My People”',
    intro: 'Isaiah declared words of tender comfort to Israel in exile, reminding them of God’s supreme power as Creator and His everlasting covenant of love. The Lord promises to strengthen, help, and uphold us with the right hand of His righteousness.',
    ideas: [
      'Isaiah 40:28–31: They that wait upon the Lord shall renew their strength and mount up with wings as eagles.',
      'Isaiah 41:10–13: “Fear thou not; for I am with thee... I will strengthen thee; yea, I will help thee.”',
      'Isaiah 43:1–7: “When thou passest through the waters, I will be with thee.”',
      'Isaiah 49:14–16: The Savior has graven us upon the palms of His hands and will never forget us.',
    ],
    reflections: [
      'How has waiting upon the Lord renewed your spiritual and emotional strength during fatigue? (Isaiah 40:31)',
      'What does it mean to you that the Savior has engraved you upon the palms of His hands? (Isaiah 49:16)',
      'How can you share words of comfort and encouragement with someone who feels forgotten? (Isaiah 40:1)',
    ],
  },
  '41': {
    reading: 'Isaiah 50–57',
    theme: 'October 5–11: “He Hath Borne Our Griefs, and Carried Our Sorrows”',
    intro: 'Isaiah 53 contains one of the most sublime prophecies of the Savior’s Atonement in all of scripture. Isaiah foresaw the Messiah wounded for our transgressions and bruised for our iniquities, through whose stripes we are healed.',
    ideas: [
      'Isaiah 53:3–5: Jesus Christ was wounded for our transgressions, and with His stripes we are healed.',
      'Isaiah 54:10: Though mountains depart, God’s kindness and covenant of peace will not be removed.',
      'Isaiah 55:1–3, 8–9: God’s ways and thoughts are higher than our ways; come unto Him and drink freely.',
      'Isaiah 58:6–12: True fasting looses the bands of wickedness, undoes heavy burdens, and blesses the poor.',
    ],
    reflections: [
      'How does meditating on Isaiah 53 deepen your reverence when partaking of the sacrament? (Isaiah 53:5)',
      'How does the truth that God’s ways are higher than mortal ways bring you peace during unanswered questions? (Isaiah 55:8–9)',
      'What can you do to make your fasts more spiritually powerful and focused on blessing others? (Isaiah 58:6–7)',
    ],
  },
  '42': {
    reading: 'Isaiah 58–66',
    theme: 'October 12–18: “The Redeemer Shall Come to Zion”',
    intro: 'Isaiah taught the true spirit of the Sabbath and fasting, promising that delighting in the holy day brings the abundance of the earth. He prophesied of Christ’s mission to bind up the brokenhearted and proclaim liberty to the captives.',
    ideas: [
      'Isaiah 58:13–14: Calling the Sabbath a delight brings spiritual joy and the blessings of the Lord.',
      'Isaiah 61:1–3: The Spirit of the Lord is upon the Savior to give beauty for ashes and the oil of joy for mourning.',
      'Isaiah 62:1–5: The Lord rejoices over His covenant people as a bridegroom rejoices over the bride.',
      'Isaiah 65:17–25: Prophecies of the Millennium when righteousness, peace, and joy will fill the earth.',
    ],
    reflections: [
      'How can you make the Sabbath a genuine "delight" in your home? (Isaiah 58:13)',
      'How has the Savior given you "beauty for ashes" and joy in place of mourning? (Isaiah 61:3)',
      'What can you do today to help build Zion in anticipation of the Millennium? (Isaiah 62:10)',
    ],
  },
  '43': {
    reading: 'Jeremiah 1–3; 7; 16–18; 20',
    theme: 'October 19–25: “Before I Formed Thee in the Belly I Knew Thee”',
    intro: 'Jeremiah was foreordained before birth to be a prophet to the nations. Despite feeling young and facing intense rejection, Jeremiah boldly warned Jerusalem, comparing the Lord’s word in his heart to a burning fire shut up in his bones.',
    ideas: [
      'Jeremiah 1:4–9: The Lord knew us before we were born and qualifies us for our mortal stewardships.',
      'Jeremiah 2:13: Forsaking the fountain of living waters to hew out broken cisterns brings spiritual thirst.',
      'Jeremiah 16:14–16: Gathering Israel in the last days is even greater than the deliverance from Egypt.',
      'Jeremiah 20:9: God’s word was in Jeremiah’s heart as a burning fire that could not be contained.',
    ],
    reflections: [
      'How does knowing you were known and loved by God before birth give you purpose? (Jeremiah 1:5)',
      'What "broken cisterns" of worldly satisfaction are people tempted by, and how do you drink from living water? (Jeremiah 2:13)',
      'How can you participate as a "fisher" or "hunter" in gathering Israel today? (Jeremiah 16:16)',
    ],
  },
  '44': {
    reading: 'Jeremiah 30–33; 36–38; 45; Lamentations 1; 3',
    theme: 'October 26–November 1: “I Will Write It in Their Hearts”',
    intro: 'Even amidst the destruction of Jerusalem, Jeremiah prophesied of the new and everlasting covenant where God’s law would be written directly into the hearts of His people. In Lamentations, he declared: “His compassions fail not. They are new every morning.”',
    ideas: [
      'Jeremiah 31:31–34: The new covenant: “I will put my law in their inward parts, and write it in their hearts.”',
      'Jeremiah 33:3: “Call unto me, and I will answer thee, and shew thee great and mighty things.”',
      'Lamentations 3:22–26: The Lord’s mercies are new every morning; great is His faithfulness.',
      'Jeremiah 38:1–13: Ebed-melech showed courage and kindness in rescuing Jeremiah from the dungeon.',
    ],
    reflections: [
      'How does having the gospel written in your heart differ from merely following outward rules? (Jeremiah 31:33)',
      'How does the truth that God’s mercies are "new every morning" give you a fresh start each day? (Lamentations 3:23)',
      'What can you do to stand up for the Lord’s servants when they are criticized or misunderstood? (Jeremiah 38:8–10)',
    ],
  },
  '45': {
    reading: 'Ezekiel 1–3; 33–34; 36–37; 47',
    theme: 'November 2–8: “A New Heart Also Will I Give You”',
    intro: 'Ezekiel served as a watchman on the tower to warn Israel. He saw visions of the dry bones coming to life by the breath of the Lord, the stick of Judah and the stick of Joseph joining together, and healing waters flowing from the temple.',
    ideas: [
      'Ezekiel 33:1–9: The duty of the watchman on the tower to sound the trumpet and warn the people in love.',
      'Ezekiel 36:26–27: “A new heart also will I give you... and I will put my spirit within you.”',
      'Ezekiel 37:15–20: The stick of Judah (the Bible) and the stick of Joseph (the Book of Mormon) become one.',
      'Ezekiel 47:1–12: Waters flowing from the temple bring healing, life, and fruitfulness to the earth.',
    ],
    reflections: [
      'How have the Bible and the Book of Mormon united in your hands to give you a powerful testimony of Jesus Christ? (Ezekiel 37:19)',
      'How has the Holy Ghost given you a "new heart" and softened your desires toward others? (Ezekiel 36:26)',
      'How do the healing waters of the temple bless you and your ancestors? (Ezekiel 47:9)',
    ],
  },
  '46': {
    reading: 'Daniel 1–6',
    theme: 'November 9–15: “There Is No Other God That Can Deliver”',
    intro: 'Daniel and his companions refused to defile themselves with the king’s meat, interpreted Nebuchadnezzar’s dream of the kingdom of God rolling forth, survived the burning fiery furnace, and were delivered from the lions’ den through steadfast faith in God.',
    ideas: [
      'Daniel 1:8–20: Choosing obedience to health and moral standards brings wisdom, knowledge, and spiritual strength.',
      'Daniel 2:34–45: The stone cut out of the mountain without hands is the Church of Jesus Christ rolling forth.',
      'Daniel 3:16–18: Shadrach, Meshach, and Abed-nego’s "but if not" faith in the fiery furnace.',
      'Daniel 6:10–23: Daniel’s unwavering daily prayer delivered him safely from the lions’ den.',
    ],
    reflections: [
      'How does developing "but if not" faith help you remain loyal to God regardless of immediate outcomes? (Daniel 3:18)',
      'How does your daily personal prayer reflect Daniel’s devotion? (Daniel 6:10)',
      'How can you stand out with integrity in your school, work, or social circle as Daniel did? (Daniel 1:8)',
    ],
  },
  '47': {
    reading: 'Hosea 1–3; 6; 14; Joel 1–3',
    theme: 'November 16–22: “I Will Love Them Freely”',
    intro: 'Hosea’s marriage symbolized the Lord’s enduring, loyal love for covenant Israel despite their unfaithfulness. Joel prophesied of the last days when the Lord would pour out His Spirit upon all flesh and sons and daughters would prophesy.',
    ideas: [
      'Hosea 2:19–20: The Lord betroths us unto Him forever in righteousness, lovingkindness, and mercies.',
      'Hosea 6:6: “For I desired mercy, and not sacrifice; and the knowledge of God more than burnt offerings.”',
      'Hosea 14:4: “I will heal their backsliding, I will love them freely.”',
      'Joel 2:28–32: In the last days, the Lord will pour out His Spirit upon all flesh.',
    ],
    reflections: [
      'How has experiencing the Lord’s unconditional love and forgiveness healed your heart? (Hosea 14:4)',
      'How have you witnessed the fulfillment of Joel’s prophecy that the Spirit is being poured out today? (Joel 2:28)',
      'How can you show steadfast loyalty in your covenants with Heavenly Father? (Hosea 6:6)',
    ],
  },
  '48': {
    reading: 'Amos; Obadiah; Jonah; Micah',
    theme: 'November 23–29: “He Delighteth in Mercy”',
    intro: 'Amos revealed that the Lord God will do nothing without revealing His secret unto His servants the prophets. Jonah learned that God’s mercy extends to all nations, and Micah taught that what the Lord requires is to do justly, love mercy, and walk humbly with God.',
    ideas: [
      'Amos 3:7: “Surely the Lord God will do nothing, but he revealeth his secret unto his servants the prophets.”',
      'Amos 8:11–12: Spiritual famine is prevented by feast upon the words of living prophets.',
      'Jonah 1–4: God is full of grace and compassion for all who repent and seek Him.',
      'Micah 6:8; 7:18–19: To do justly, to love mercy, and to walk humbly with thy God.',
    ],
    reflections: [
      'How does listening to living prophets protect you from spiritual famine in the world? (Amos 8:11)',
      'What does it mean in your daily discipleship to "walk humbly with thy God"? (Micah 6:8)',
      'How can you overcome hesitation and share the gospel with love as Jonah was called to do? (Jonah 3:1–3)',
    ],
  },
  '49': {
    reading: 'Nahum; Habakkuk; Zephaniah; Haggai',
    theme: 'November 30–December 6: “The Lord Thy God in the Midst of Thee Is Mighty”',
    intro: 'Habakkuk questioned the Lord about wickedness but resolved: “Yet I will rejoice in the Lord, I will joy in the God of my salvation.” Haggai urged the returned exiles to “consider your ways” and build the house of the Lord before their own ceiled houses.',
    ideas: [
      'Habakkuk 2:1–4; 3:17–19: The just shall live by his faith; we can rejoice in God even when earthly harvests fail.',
      'Zephaniah 3:14–17: “The Lord thy God in the midst of thee is mighty; he will save, he will rejoice over thee with joy.”',
      'Haggai 1:1–8: “Consider your ways” — putting the temple and Lord’s priorities first.',
      'Haggai 2:6–9: The glory of the Lord’s holy temple shall surpass all earthly treasures.',
    ],
    reflections: [
      'How can you "consider your ways" and ensure God’s kingdom is your highest priority? (Haggai 1:5)',
      'When temporal circumstances are difficult, how can you still "joy in the God of your salvation"? (Habakkuk 3:18)',
      'How does knowing the Lord "rejoices over you with joy" strengthen your sense of worth? (Zephaniah 3:17)',
    ],
  },
  '50': {
    reading: 'Zechariah 1–3; 7–14; Malachi 1–2',
    theme: 'December 7–13: “Return unto Me, and I Will Return unto You”',
    intro: 'Zechariah foretold Christ’s triumphal entry upon a colt and His Second Coming to the Mount of Olives. Malachi warned against offering blemished sacrifices to God and pleaded for honoring sacred marriage covenants.',
    ideas: [
      'Zechariah 1:3: “Turn ye unto me, saith the Lord of hosts, and I will turn unto you.”',
      'Zechariah 9:9: “Rejoice greatly, O daughter of Zion... behold, thy King cometh unto thee: he is just, and having salvation.”',
      'Zechariah 13:6: In His Second Coming, the Savior will show the wounds in His hands received in the house of His friends.',
      'Malachi 2:13–16: Honor your marriage covenants with fidelity and love.',
    ],
    reflections: [
      'What invitation from the Savior to "return unto Him" can you accept this week? (Zechariah 1:3)',
      'How does Zechariah’s prophecy of the Savior’s triumphal entry build your testimony of Jesus Christ? (Zechariah 9:9)',
      'How can you give the Lord your best offering of heart and mind rather than a "blemished" effort? (Malachi 1:8)',
    ],
  },
  '51': {
    reading: 'Christmas',
    theme: 'December 14–20: “Unto Us a Child Is Born”',
    intro: 'At Christmas we celebrate the birth of Jesus Christ, the Son of God and Light of the World. He came to earth in humility in Bethlehem to offer the infinite and eternal sacrifice that brings peace on earth and goodwill to all mankind.',
    ideas: [
      'Isaiah 7:14; 9:6–7: For unto us a child is born, unto us a son is given; and His name shall be called Wonderful, Counsellor, Prince of Peace.',
      'Micah 5:2: Prophecy that Bethlehem would be the birthplace of the Ruler in Israel.',
      'Luke 2:1–20: The angelic announcement of good tidings of great joy and the shepherds’ prompt worship.',
      'Matthew 2:1–12: The Wise Men brought precious gifts to worship the Christ child.',
    ],
    reflections: [
      'What gift of devotion, service, or forgiveness can you offer the Savior this Christmas? (Matthew 2:11)',
      'How does the title "Prince of Peace" manifest in your personal life and home? (Isaiah 9:6)',
      'How can your family focus on the true light of Christ amidst holiday activities? (Luke 2:14)',
    ],
  },
  '52': {
    reading: 'Malachi 3–4',
    theme: 'December 21–27: “He Shall Turn the Heart of the Fathers to the Children”',
    intro: 'The Old Testament concludes with Malachi’s glorious prophecy of the mission of Elijah. Elijah was promised to return in the latter days to turn the hearts of the fathers to the children, restoring the sealing keys that unite families for eternity.',
    ideas: [
      'Malachi 3:8–12: Paying an honest tithe opens the windows of heaven and pours out blessings beyond measure.',
      'Malachi 3:16–18: The Lord remembers His jewels—those who fear Him and think upon His name.',
      'Malachi 4:1–3: The Sun of righteousness shall arise with healing in His wings.',
      'Malachi 4:5–6; D&C 110:13–16: Elijah restored the sealing keys to Joseph Smith in the Kirtland Temple, uniting families across generations.',
    ],
    reflections: [
      'How has living the law of tithing brought spiritual and temporal protection to your family? (Malachi 3:10)',
      'How are you participating in temple and family history work to turn your heart to your ancestors? (Malachi 4:6)',
      'How has studying the Old Testament this year strengthened your foundation in Jesus Christ?',
    ],
  },
};

/**
 * Universal dynamic parser for Church Come Follow Me web pages
 */
export function parseCfmHtml(html: string, originalUrl: string): ParsedCfmGuide {
  let readingBlock = '';
  let studyTheme = '';
  let introduction = '';
  const ideasList: string[] = [];

  // Extract lesson number from URL (e.g. /38?lang=eng -> "38")
  const lessonNumMatch = originalUrl.match(/\/(\d+)(?:[^\d]|$)/);
  const lessonNum = lessonNumMatch ? String(Number(lessonNumMatch[1])) : '';

  if (html && html.trim().length > 100) {
    try {
      // 1. Extract <p class="title-number"> or <title>
      const titleNumMatch = html.match(/<p[^>]*class="[^"]*title-number[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
      if (titleNumMatch) {
        studyTheme = cleanHtml(titleNumMatch[1]);
      }

      // 2. Extract <h1 ...> for reading block
      const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      if (h1Match) {
        readingBlock = cleanHtml(h1Match[1]);
      }

      // 3. Fallback from <title> tag if h1 or title-number were missing
      if (!readingBlock || !studyTheme) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          const fullTitle = cleanHtml(titleMatch[1]);
          const colonIdx = fullTitle.lastIndexOf(':');
          if (colonIdx > -1) {
            if (!studyTheme) studyTheme = fullTitle.substring(0, colonIdx).replace(/\.\s*“/, ': “').trim();
            if (!readingBlock) readingBlock = fullTitle.substring(colonIdx + 1).trim();
          } else if (!studyTheme) {
            studyTheme = fullTitle;
          }
        }
      }

      // 4. Extract Headings & Scripture Titles (<p class="scripture-title"> and <h3 ...>)
      const sectionRegex = /<p[^>]*class="[^"]*scripture-title[^"]*"[^>]*>([\s\S]*?)<\/p>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/gi;
      let match: RegExpExecArray | null;
      while ((match = sectionRegex.exec(html)) !== null) {
        const scriptureRef = cleanHtml(match[1]);
        const heading = cleanHtml(match[2]);
        if (scriptureRef && heading && !heading.toLowerCase().includes('scripture helps')) {
          ideasList.push(`${scriptureRef}: ${heading}`);
        }
      }

      // 5. Extract Lead Introductory Paragraph (id="p1" or first <p data-aid> in body)
      const p1Match = html.match(/<p[^>]*id="p1"[^>]*>([\s\S]*?)<\/p>/i) ||
                      html.match(/<p[^>]*data-aid="[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
      if (p1Match) {
        const text = cleanHtml(p1Match[1]);
        if (text.length > 50 && !text.includes('Search') && !text.includes('Copyright')) {
          introduction = text;
        }
      }
    } catch (err) {
      console.warn('DOM parser error, falling back to curriculum dictionary', err);
    }
  }

  // Check complete 52-week curriculum database for exact match
  const cur = lessonNum && CFM_52_WEEKS[lessonNum];

  if ((!readingBlock || readingBlock === 'Scripture Reading Block') && cur) readingBlock = cur.reading;
  if ((!studyTheme || studyTheme === 'Come, Follow Me Lesson') && cur) studyTheme = cur.theme;
  if ((!introduction || introduction.includes('Spirit guides us')) && cur) introduction = cur.intro;

  let ideasForLearning = ideasList.length > 0
    ? ideasList.slice(0, 4).join('\n')
    : (cur?.ideas ? cur.ideas.join('\n') : '');

  if (!ideasForLearning && cur) {
    ideasForLearning = cur.ideas.join('\n');
  }

  const reflectionOptions = cur?.reflections || [
    `How does the doctrine taught in ${readingBlock || 'this week’s study'} help you turn to the Savior for peace and forgiveness?`,
    `In what ways can you share what the Lord has done for your soul with your family and ministering friends?`,
    `What specific invitation from this lesson will you act upon this week to increase your faith in Jesus Christ?`,
  ];

  return {
    url: originalUrl,
    reading_block: readingBlock || 'Scripture Reading Block',
    study_theme: studyTheme || 'Come, Follow Me Lesson',
    introduction: introduction || 'As we study the scriptures this week, the Spirit guides us to deepen our testimony and discipleship in Jesus Christ.',
    ideas_for_learning: ideasForLearning,
    reflection_options: reflectionOptions,
    selected_reflection: reflectionOptions[0],
  };
}

/**
 * Universal Client-Side Fetcher with CORS Proxy Fallbacks & Instant Curriculum Engine
 */
export async function fetchAndParseCfmUrl(url: string): Promise<ParsedCfmGuide> {
  const lessonNumMatch = url.match(/\/(\d+)(?:[^\d]|$)/);
  const lessonNum = lessonNumMatch ? String(Number(lessonNumMatch[1])) : '';

  // 1. If lesson is in complete 52-week database, retrieve it immediately
  const known = lessonNum && CFM_52_WEEKS[lessonNum];

  // 2. Try fetching live HTML via multiple endpoints if online
  const endpoints = [
    url,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const resp = await fetch(endpoint, {
        headers: { Accept: 'text/html,application/xhtml+xml' },
        signal: AbortSignal.timeout(3000),
      });
      if (resp.ok) {
        const text = await resp.text();
        if (text && text.length > 300) {
          const parsed = parseCfmHtml(text, url);
          if (parsed.reading_block && parsed.reading_block !== 'Scripture Reading Block' &&
              parsed.study_theme && parsed.study_theme !== 'Come, Follow Me Lesson') {
            return parsed;
          }
        }
      }
    } catch {
      // Continue to next endpoint
    }
  }

  // 3. Guaranteed instant resolution from complete 52-week curriculum
  if (known) {
    return {
      url,
      reading_block: known.reading,
      study_theme: known.theme,
      introduction: known.intro,
      ideas_for_learning: known.ideas.join('\n'),
      reflection_options: known.reflections,
      selected_reflection: known.reflections[0],
    };
  }

  return parseCfmHtml('', url);
}

/**
 * Instant offline / cache lookup based on URL structure
 */
export function generateCfmFromUrlOffline(url: string): ParsedCfmGuide {
  const lessonNumMatch = url.match(/\/(\d+)(?:[^\d]|$)/);
  const lessonNum = lessonNumMatch ? String(Number(lessonNumMatch[1])) : '';

  if (lessonNum && CFM_52_WEEKS[lessonNum]) {
    const cur = CFM_52_WEEKS[lessonNum];
    return {
      url,
      reading_block: cur.reading,
      study_theme: cur.theme,
      introduction: cur.intro,
      ideas_for_learning: cur.ideas.join('\n'),
      reflection_options: cur.reflections,
      selected_reflection: cur.reflections[0],
    };
  }

  return parseCfmHtml('', url);
}
