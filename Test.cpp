#include<stdio.h>
#include<string.h>
extern void MAYAIAS(void* p,void* q)
extern void broadcast(char* num);
char *tgetstr(){
	//e.g
	static char initstr[25] = "selsect * From City ...";
	return initstr;
} 


int main(){
	char *injection = tgetstr();
	char* s = injection;
	char* b = s;
	MAYAIAS(injection,s);
	broadcast(b);
	
	return 0;
}



// Tainted Flow Analysis Result:
Source detected: injection at line 13
Taint propagated from injection to s at line 14
Taint propagated from s to b at line 15
Potential tainted flow detected at line 17: variable 'b' from source flows to sink 'broadcast'.
