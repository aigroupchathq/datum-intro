/* Provenance folio: 3D stack, drag and swipe, stepped tabs and record ledger. */
(function(){
  'use strict';
  var wrap=document.getElementById('drivers-folio'),
      deck=document.getElementById('folio-deck');
  if(!wrap||!deck)return;
  var tabs=Array.prototype.slice.call(wrap.querySelectorAll('[data-folio-tab]')),
      cards=Array.prototype.slice.call(deck.querySelectorAll('[data-folio-card]')),
      dots=Array.prototype.slice.call(wrap.querySelectorAll('#folio-dots i')),
      countEl=document.getElementById('folio-count'),
      quoteBadge=document.getElementById('folio-quote-badge'),
      prevBtn=document.getElementById('folio-prev'),
      nextBtn=document.getElementById('folio-next');
  var total=cards.length;
  if(!total)return;
  var LABELS=[
    'PLATE 01 / 04,  ACQUISITION',
    'PLATE 02 / 04,  ROUTINE CARE',
    'PLATE 03 / 04,  MEANINGFUL DRIVE',
    'PLATE 04 / 04,  REFLECTION'
  ];
  var SHORT=[
    'PLATE 01 / 04,  ACQUISITION',
    'PLATE 02 / 04,  CARE',
    'PLATE 03 / 04,  DRIVE',
    'PLATE 04 / 04,  REFLECT'
  ];
  var active=0,animating=false,throwTimer=null;
  function reducedMotion(){
    return window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function applyStack(idx){
    active=((idx%total)+total)%total;
    for(var i=0;i<total;i++){
      var pos=(i-active+total)%total;
      cards[i].setAttribute('data-pos',String(pos));
      cards[i].setAttribute('aria-hidden',pos===0?'false':'true');
      cards[i].inert=pos!==0;
      cards[i].classList.remove('is-throwing-left','is-throwing-right');
      cards[i].removeAttribute('data-dragging');
      cards[i].style.transform='';
      cards[i].style.opacity='';
    }
    for(var j=0;j<tabs.length;j++){
      var sel=(j===active);
      tabs[j].setAttribute('aria-selected',sel?'true':'false');
      tabs[j].tabIndex=sel?0:-1;
    }
    for(var k=0;k<dots.length;k++){
      dots[k].classList.toggle('on',k===active);
    }
    var lbl=LABELS[active]||('PLATE 0'+(active+1)+' / 0'+total);
    if(countEl)countEl.textContent=SHORT[active]||lbl;
    if(quoteBadge)quoteBadge.textContent=lbl;
  }
  function goTo(targetIdx,throwDir){
    var next=((targetIdx%total)+total)%total;
    if(next===active)return;
    clearTimeout(throwTimer);
    if(!throwDir||reducedMotion()||animating){
      animating=false;
      applyStack(next);
      return;
    }
    animating=true;
    var topCard=cards[active];
    topCard.removeAttribute('data-dragging');
    topCard.style.transform='';
    topCard.classList.add(throwDir<0?'is-throwing-left':'is-throwing-right');
    throwTimer=setTimeout(function(){
      animating=false;
      applyStack(next);
    },190);
  }
  tabs.forEach(function(tab){
    tab.addEventListener('click',function(){
      var idx=parseInt(tab.getAttribute('data-folio-tab'),10);
      if(!isNaN(idx))goTo(idx,idx>active?-1:1);
    });
    tab.addEventListener('keydown',function(e){
      if(e.key==='ArrowRight'||e.key==='ArrowDown'){
        e.preventDefault();
        var n=(active+1)%total;
        goTo(n,-1);
        if(tabs[n])tabs[n].focus();
      }else if(e.key==='ArrowLeft'||e.key==='ArrowUp'){
        e.preventDefault();
        var p=(active-1+total)%total;
        goTo(p,1);
        if(tabs[p])tabs[p].focus();
      }else if(e.key==='Home'){
        e.preventDefault();
        goTo(0,1);
        if(tabs[0])tabs[0].focus();
      }else if(e.key==='End'){
        e.preventDefault();
        goTo(total-1,-1);
        if(tabs[total-1])tabs[total-1].focus();
      }
    });
  });
  if(prevBtn)prevBtn.addEventListener('click',function(){goTo(active-1,1);});
  if(nextBtn)nextBtn.addEventListener('click',function(){goTo(active+1,-1);});

  /* Inspect record toggle, both the top pill and the photo circle button. */
  wrap.addEventListener('click',function(e){
    var btn=e.target.closest('[data-folio-inspect]');
    if(!btn)return;
    e.stopPropagation();
    var idx=parseInt(btn.getAttribute('data-folio-inspect'),10);
    var card=cards[idx];
    if(!card)return;
    var open=card.classList.toggle('is-inspected');
    var triggers=card.querySelectorAll('[data-folio-inspect]');
    for(var i=0;i<triggers.length;i++){
      triggers[i].setAttribute('aria-expanded',open?'true':'false');
    }
    var txt=card.querySelector('.fib-txt');
    if(txt)txt.textContent=open?'Close record':'Inspect record';
    var topBtn=card.querySelector('.folio-inspect-btn');
    if(topBtn)topBtn.setAttribute('aria-label',open?'Close record':'Inspect record');
  });

  /* Pointer drag and touch swipe. */
  var dragState=null;
  deck.addEventListener('pointerdown',function(e){
    if(animating)return;
    if(e.button!==undefined&&e.button!==0)return;
    if(e.target.closest('button,a'))return;
    var topCard=cards[active];
    if(!topCard||!topCard.contains(e.target))return;
    var nextCard=cards[(active+1)%total];
    dragState={
      id:e.pointerId,
      startX:e.clientX,
      startY:e.clientY,
      startT:Date.now(),
      dx:0,
      locked:false,
      canceled:false,
      topCard:topCard,
      nextCard:nextCard
    };
  });
  deck.addEventListener('pointermove',function(e){
    if(!dragState||dragState.canceled||e.pointerId!==dragState.id)return;
    var dx=e.clientX-dragState.startX;
    var dy=e.clientY-dragState.startY;
    if(!dragState.locked){
      if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){
        dragState.canceled=true;
        return;
      }
      if(Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*1.15){
        dragState.locked=true;
        dragState.topCard.setAttribute('data-dragging','true');
        if(dragState.nextCard)dragState.nextCard.setAttribute('data-dragging','true');
        try{dragState.topCard.setPointerCapture(e.pointerId);}catch(err){}
      }else{
        return;
      }
    }
    dragState.dx=dx;
    var lift=-Math.min(14,Math.abs(dx)*0.07);
    var rot=(dx*0.045).toFixed(2);
    dragState.topCard.style.transform='translate3d('+dx.toFixed(1)+'px,'+lift.toFixed(1)+'px,0) rotate('+rot+'deg)';
    if(dragState.nextCard){
      var p=Math.min(1,Math.abs(dx)/140);
      var ny=(13*(1-p)).toFixed(1);
      var ns=(0.962+0.038*p).toFixed(3);
      var nr=(0.85*(1-p)).toFixed(2);
      dragState.nextCard.style.transform='translate3d(0,'+ny+'px,0) scale('+ns+') rotate('+nr+'deg)';
    }
  });
  function endDrag(e){
    if(!dragState||(e&&e.pointerId!==undefined&&e.pointerId!==dragState.id))return;
    var st=dragState;
    dragState=null;
    st.topCard.removeAttribute('data-dragging');
    st.topCard.style.transform='';
    if(st.nextCard){
      st.nextCard.removeAttribute('data-dragging');
      st.nextCard.style.transform='';
    }
    if(!st.locked||st.canceled)return;
    var dt=Math.max(1,Date.now()-st.startT);
    var vx=st.dx/dt;
    if(Math.abs(st.dx)>52||Math.abs(vx)>0.35){
      if(st.dx<0){
        goTo(active+1,-1);
      }else{
        goTo(active-1,1);
      }
    }
  }
  deck.addEventListener('pointerup',endDrag);
  deck.addEventListener('pointercancel',endDrag);
  applyStack(0);
})();
