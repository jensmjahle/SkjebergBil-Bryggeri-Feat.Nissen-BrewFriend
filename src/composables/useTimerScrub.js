import { ref, computed } from 'vue';
const MAX = 365 * 86400;
export function useTimerScrub(options) {
  const preview = ref(null), dragging = ref(false);
  const remaining = computed(()=>preview.value ?? options.remaining());
  let originX=0, originRemaining=0, scale=1, moved=false;
  const clamp = value => Math.round(Math.max(0,Math.min(MAX,value)));
  function down(event) {
    if (!options.editable() || event.button !== 0) return;
    event.preventDefault();event.stopPropagation();
    originX=event.clientX;originRemaining=options.remaining();scale=Math.max(options.total(),60)/Math.max(event.currentTarget.getBoundingClientRect().width,1);moved=false;
    preview.value=originRemaining;dragging.value=true;event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event) {
    if(!dragging.value) return;
    const dx=event.clientX-originX;if(Math.abs(dx)>=3)moved=true;
    preview.value=clamp(originRemaining-dx*scale);
  }
  function up(event) {
    if(!dragging.value) return;
    event.preventDefault();event.stopPropagation();
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    const value=preview.value;preview.value=null;dragging.value=false;
    if(moved)options.commit(value);
  }
  function cancel() { preview.value=null;dragging.value=false; }
  function key(event) {
    if(!options.editable() || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
    event.preventDefault();event.stopPropagation();
    const amount=(options.total()>=86400?3600:60)*(event.shiftKey?10:1);
    options.commit(clamp(event.key==='Home'?(options.resetTotal?.() ?? options.total()):event.key==='End'?0:options.remaining()+(['ArrowLeft','ArrowUp'].includes(event.key)?amount:-amount)));
  }
  return { remaining, dragging, down, move, up, cancel, key };
}
