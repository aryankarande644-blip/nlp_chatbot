export function formatReply(intent, responses, context, entities, source = 'intent', extras = {}) {
  if (!responses || responses.length === 0) {
    return "I'm not sure how to respond to that.";
  }
  // pick response avoiding last bot reply
  let candidates = responses.slice();
  if (extras.lastBotReply) {
    candidates = candidates.filter(r => r !== extras.lastBotReply);
  }
  if (candidates.length === 0) candidates = responses.slice();
  // random pick
  const idx = Math.floor(Math.random() * candidates.length);
  let reply = candidates[idx];
  
  // placeholders
  const name = context.userName;
  if (reply.includes('{name_comma}')) {
    if (name) reply = reply.replace('{name_comma}', ', ' + name);
    else reply = reply.replace('{name_comma}', '');
  }
  if (reply.includes('{name}')) {
    if (name) reply = reply.replace('{name}', name);
    else reply = reply.replace('{name}', 'there');
  }
  if (reply.includes('{time}')) {
    reply = reply.replace('{time}', new Date().toLocaleTimeString());
  }
  if (reply.includes('{date}')) {
    reply = reply.replace('{date}', new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }
  if (reply.includes('{result}')) {
    reply = reply.replace('{result}', extras.result !== undefined ? extras.result : '');
  }
  
  // mood empathy
  if (extras.sentiment && extras.sentiment.score <= -0.5 && intent !== 'insult') {
    const empathetic = ["I'm sorry to hear that. ", "That sounds tough. ", "I understand that can be difficult. "];
    const prefix = empathetic[Math.floor(Math.random() * empathetic.length)];
    if (!reply.startsWith("I'm sorry") && !reply.startsWith("That sounds")) {
      reply = prefix + reply;
    }
  }
  
  return reply;
}
