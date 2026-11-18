(() => {
 const params=new URLSearchParams(location.search),result=params.get('result'),en=(localStorage.getItem('aprueba:checkout-locale')||localStorage.getItem('lang')||navigator.language).startsWith('en');
 document.documentElement.lang=en?'en':'es';
 const set=(id,es,english)=>{document.getElementById(id).textContent=en?english:es;};
 if(result==='opening'){
   set('return-title','Conectando con PayPal','Connecting to PayPal');set('return-message','Estamos preparando tu suscripción.','We are preparing your subscription.');document.getElementById('return-link').hidden=true;set('return-help','Esta ventana se actualizará automáticamente.','This window will update automatically.');return;
 }
 const cancelled=result==='cancel';
 set('return-title',cancelled?'Pago no completado':'Estamos confirmando tu suscripción',cancelled?'Payment not completed':'Confirming your subscription');
 set('return-message',cancelled?'Puedes volver a Aprueba y continuar cuando quieras.':'Aprueba verificará el pago y actualizará tu plan automáticamente.',cancelled?'Return to Aprueba and continue whenever you are ready.':'Aprueba will verify your payment and update your plan automatically.');
 set('return-link','Volver a Aprueba','Return to Aprueba');
 const target=params.get('target')==='mobile'?'/movil/#/plans?payment=return':'/plan?payment=return';document.getElementById('return-link').href=target;
 if(window.opener){
   window.opener.postMessage({type:'aprueba:paypal-return',cancelled},location.origin);
   set('return-help','Puedes cerrar esta ventana y continuar en Aprueba.','You can close this window and continue in Aprueba.');
   setTimeout(()=>window.close(),1200);
 }else{
   set('return-help','Si estás usando la aplicación, vuelve a ella para ver tu suscripción.','If you are using the app, return to it to view your subscription.');
 }
})();
