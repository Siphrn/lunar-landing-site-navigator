"""Calm ambient background track for the demo video, composed from scratch with numpy (no samples, no licence needed).

  python docs/compose_demo_music.py demo/ambient.wav

30 s, 44.1 kHz stereo: four slow pad chords (Dmaj7, Bm7, Gmaj7, A add9) with soft bass, a few bell notes and reverb.
"""
import numpy as np, wave, sys
SR=44100; DUR=30.0; N=int(SR*DUR); t=np.arange(N)/SR
rng=np.random.default_rng(7)
hz=lambda m: 440*2**((m-69)/12)
chords=[[50,57,61,66],[47,54,57,62],[43,50,54,59],[45,52,57,61]]  # Dmaj7, Bm7, Gmaj7, A(add9)
seg=DUR/4; xf=2.5
L=np.zeros(N); R=np.zeros(N)
def env(start,end):
    e=np.zeros(N); a=(t-start)/xf; b=(end+xf-t)/xf
    e=np.clip(np.minimum(a,b),0,1); return np.sin(e*np.pi/2)**2
for i,ch in enumerate(chords):
    s0=i*seg-(xf if i else 0)*0.5; s1=(i+1)*seg
    e=env(max(s0,-xf),s1 if i<3 else DUR+xf)
    for k,m in enumerate(ch):
        f=hz(m)
        for det,pan in ((-3,0.3),(3,0.7)):   # two detuned voices per note, spread in stereo
            ff=f*2**(det/1200); ph=rng.uniform(0,2*np.pi)
            v=np.sin(2*np.pi*ff*t+ph)+0.25*np.sin(4*np.pi*ff*t+ph)+0.08*np.sin(6*np.pi*ff*t+ph)
            v*=e*(0.9 if k else 1.0)*(1+0.15*np.sin(2*np.pi*0.11*t+k))  # slow swell
            L+=v*(1-pan); R+=v*pan
    b=hz(ch[0]-12); bv=np.sin(2*np.pi*b*t)*e*0.9; L+=bv*0.5; R+=bv*0.5   # soft bass
# sparse bell notes from the chord tones, an octave or two up
for i,ch in enumerate(chords):
    for j,dt in enumerate((1.2,3.4,5.6)):
        st=i*seg+dt+rng.uniform(-0.2,0.2)
        if st>DUR-3: continue
        m=ch[(j+i)%4]+24; f=hz(m); idx=t>=st; tt=t[idx]-st
        v=(np.sin(2*np.pi*f*tt)+0.3*np.sin(2*np.pi*f*2.01*tt))*np.exp(-tt/1.6)*np.minimum(tt/0.01,1)*0.35
        pan=rng.uniform(0.25,0.75); L[idx]+=v*(1-pan); R[idx]+=v*pan
# gentle low-pass in the frequency domain
def lowpass(x,fc=2500):
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X*=1/np.sqrt(1+(f/fc)**4); return np.fft.irfft(X,len(x))
# reverb: convolve with decaying noise (FFT)
irl=int(SR*3.0); ti=np.arange(irl)/SR
def reverb(x,seed):
    ir=np.random.default_rng(seed).standard_normal(irl)*np.exp(-ti/0.9); ir=lowpass(ir,4000); ir/=np.sqrt((ir**2).sum())
    n=len(x)+irl; y=np.fft.irfft(np.fft.rfft(x,n)*np.fft.rfft(ir,n),n)[:len(x)]; return y
L=lowpass(L); R=lowpass(R)
L=0.65*L+0.55*reverb(L,1); R=0.65*R+0.55*reverb(R,2)
fade=np.minimum(np.clip(t/2.0,0,1),np.clip((DUR-t)/3.0,0,1))
L*=fade; R*=fade
pk=max(abs(L).max(),abs(R).max()); L*=0.5/pk; R*=0.5/pk   # peak about -6 dB
data=(np.stack([L,R],1)*32767).astype(np.int16)
with wave.open(sys.argv[1],'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())
print("ok", data.shape)
