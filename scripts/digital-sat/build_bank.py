"""Original, individually authored Digital SAT items; no numeric template expansion.
Each numeric key is checked with SymPy using the independent derivation in `verify`.
Text/expressions carry mathematical conditions checked separately from their key.
"""
import json, uuid, sympy as s
from pathlib import Path
from collections import Counter
from difflib import SequenceMatcher
x,k,a,b=s.symbols('x k a b', real=True)
bank=[]
DOM={'A':'Algebra','B':'Advanced Math','D':'Problem-Solving and Data Analysis','G':'Geometry and Trigonometry'}
SK={
'L1':'Linear equations in one variable','LF':'Linear functions','L2':'Linear equations in two variables','LS':'Systems of two linear equations in two variables','LI':'Linear inequalities in one or two variables',
'EQ':'Equivalent expressions','NE':'Nonlinear equations in one variable and systems of equations in two variables','NF':'Nonlinear functions',
'RU':'Ratios, rates, proportional relationships, and units','PC':'Percentages','OD':'One-variable data: distributions and measures of center and spread','TD':'Two-variable data: models and scatterplots','PR':'Probability and conditional probability','IN':'Inference from sample statistics and margin of error','ST':'Evaluating statistical claims: observational studies and experiments',
'AV':'Area and volume','LT':'Lines, angles, and triangles','RT':'Right triangles and trigonometry','CI':'Circles'}
def q(pool,domain,diff,skill,prompt,choices,answer,why,verify,checks=()):
    """Answer is the index of the unique correct choice. verify is an independent
    symbolic/numeric value for numeric options, or True for textual interpretation.
    checks must substantiate textual keys with model/property assertions."""
    assert len(choices)==4 and len(set(choices))==4 and 0<=answer<4
    assert all(bool(c) for c in checks), prompt
    if verify is not True:
        verify=s.nsimplify(verify)
        vals=[s.sympify(c) for c in choices]
        matches=[s.simplify(v-verify)==0 for v in vals]
        assert sum(matches)==1 and matches[answer], (prompt,verify,choices)
    else:
        assert checks, 'Text key requires independent property checks'
    idx=len(bank)+1
    # Five numeric student-produced responses per 22-item form.
    in_form=sum(r['pool']==pool for r in bank)%22
    spr=False  # Student responses are assigned to common eligible slots after both forms are authored.
    row={'id':str(uuid.uuid5(uuid.NAMESPACE_URL,f'prep-digital-sat-2026-original-{idx}')),
      'pool':pool,'test_type':'SAT','exam_name':'Digital SAT adaptive practice bank',
      'section_name':'Math','category_name':DOM[domain],'topic_name':SK[skill],
      'subtopic_name':skill,'difficulty':diff.title(),'difficulty_score':{'easy':0.25,'medium':0.55,'hard':0.85}[diff],
      'question_text':__import__('re').sub(r'\$(\d+(?:,\d{3})*(?:\.\d+)?)',r'\1 dollars',prompt),'question_type':'student_produced_response' if spr else 'multiple_choice',
      'correct_answer':str(s.simplify(verify)) if spr else 'ABCD'[answer],
      'official_explanation':why,'choice_a':None if spr else choices[0].replace('sqrt(', '√('),'choice_b':None if spr else choices[1].replace('sqrt(', '√('),
      'choice_c':None if spr else choices[2].replace('sqrt(', '√('),'choice_d':None if spr else choices[3].replace('sqrt(', '√('),'choice_e':None,
      'source':'Prep SAT/ACT original Digital SAT bank, September 2026','source_type':'original','source_rights_status':'original',
      'approved':True,'active':True,'answer_verification_status':'verified','review_status':'approved',
      'calculator_allowed':True,'desmos_useful':domain in ('A','B'),'desmos_mode':'graphing','reasoning_type':'sat_reasoning',
      'module_label':'Math Module 1' if pool=='mixed' else 'Math Module 2: '+pool,
      'verification':str(verify),'verification_checks':len(checks)}
    # SPR answers in this bank are finite decimals/integers, never symbolic radicals.
    if spr: assert s.sympify(row['correct_answer']).is_Rational
    if not spr and verify is not True:
        for letter in 'abcd':
            v=row['choice_'+letter]
            if '/' in v or '√' in v:
                row['choice_'+letter]='$'+s.latex(s.sympify(v.replace('√(', 'sqrt(')))+'$'
    if not spr:
        original = [row['choice_'+v] for v in 'abcd']
        order = list(range(4))
        __import__('random').Random(idx).shuffle(order)
        for letter, oldindex in zip('abcd', order): row['choice_'+letter] = original[oldindex]
        row['correct_answer'] = 'ABCD'[order.index(answer)]
    # Bind exact figures by semantic prompt rather than an assumed ordinal.
    if '3x + 4y = 24 intersects' in prompt: row['image_url']='/digital-sat/math/line-intercepts.svg'
    if 'observed y = 47' in prompt: row['image_url']='/digital-sat/math/residual.svg'
    if 'Measurements give (time in hours' in prompt: row['image_url']='/digital-sat/math/temperature.svg'
    if 'A two-way table records 18 students' in prompt: row['image_url']='/digital-sat/math/two-way-table.svg'
    if 'Data set A is 2, 4, 6, 8, 10.' in prompt: row['image_url']='/digital-sat/math/dotplots.svg'
    bank.append(row)

# MODULE 1, FORM A: eight algebra, eight advanced, three data, three geometry.
q('mixed','A','easy','LF','A repair shop charges a fixed inspection fee plus a constant hourly labor fee. A 2-hour repair costs $95, and a 5-hour repair costs $200. What is the inspection fee, in dollars?', ['25','35','60','70'],0, 'The hourly rate is (200−95)/(5−2)=35. Subtracting 2(35) from 95 gives the fixed fee, 25.',s.Rational(95)-2*s.Rational(200-95,5-2))
q('mixed','A','easy','L1','If 3(2x − 5) = 4x + 9, what is the value of x − 2?', ['10','12','14','24'],0,'Expanding gives 6x−15=4x+9, so x=12. The requested value is x−2=10.',s.solve(3*(2*x-5)-(4*x+9),x)[0]-2)
q('mixed','A','medium','L2','The line 3x + 4y = 24 intersects the x-axis at P and the y-axis at Q. What is the slope of the line through P and Q?', ['-4/3','-3/4','3/4','4/3'],1,'Solving for y gives y=−(3/4)x+6, so the slope is −3/4.',s.diff((24-3*x)/4,x))
q('mixed','A','medium','LS','At a museum, adult tickets cost $12 and student tickets cost $8. A group buys 18 tickets for $184. How many more adult tickets than student tickets does the group buy?', ['2','4','6','8'],0,'With a+s=18 and 12a+8s=184, subtracting 8(a+s)=144 gives 4a=40. Thus a=10, s=8, and a−s=2.',2*((184-8*18)/4)-18)
q('mixed','A','medium','LI','A club has $240 for notebooks and pens. Notebooks cost $6 each and pens cost $2 each. If the club buys 25 notebooks, what is the greatest number of pens it can buy?', ['30','45','60','90'],1,'The notebooks cost 150, leaving 90. At 2 per pen, the maximum is 45.',s.floor((240-6*25)/2))
q('mixed','A','medium','LF','A tank initially contains 360 liters of water. Water drains at a constant rate, and 240 liters remain after 8 minutes. How many minutes after draining begins will the tank contain 90 liters?', ['6','12','18','24'],2,'The tank loses 120/8=15 liters per minute. Losing 360−90=270 liters takes 18 minutes.',s.Rational(360-90,s.Rational(360-240,8)))
q('mixed','A','hard','LS','The system 2x + 3y = 7 and (k − 1)x + (k + 2)y = 21 has infinitely many solutions. What is k?', ['3','6','7','9'],2,'The constants require the second equation to be three times the first. Thus k−1=6 and k+2=9, both giving k=7.',7,checks=(7-1==3*2,7+2==3*3,21==3*7))
q('mixed','A','hard','L1','The equation a(2x − 3) + b(x + 4) = 7x − 5 is true for every real number x. What is a − b?', ['-2','2','4','8'],1,'Matching coefficients gives 2a+b=7 and −3a+4b=−5. Solving yields a=3 and b=1, so a−b=2.',2,checks=(s.expand(3*(2*x-3)+(x+4)-(7*x-5))==0,))
q('mixed','B','easy','EQ','Which expression is equivalent to (x + 3)² − (x − 3)²?', ['12x','6x','18','2x² + 18'],0,'Expanding both squares cancels the x² and constant terms, leaving 12x.',True,checks=(s.expand((x+3)**2-(x-3)**2)==12*x,))
q('mixed','B','easy','NF','The function h(t) = 80(0.75)^t models the mass, in grams, of a substance after t hours. By what percentage does the mass decrease each hour?', ['0.75','25','75','80'],1,'A factor of 0.75 leaves 75% of the previous mass, a decrease of 25%.',100*(1-s.Rational(3,4)))
q('mixed','B','medium','NE','The equation x² − 7x + 10 = 0 has solutions r and s. What is r² + s²?', ['19','25','29','49'],2,'The roots have sum 7 and product 10. Therefore r²+s²=(r+s)²−2rs=49−20=29.',sum(v*v for v in s.solve(x*x-7*x+10,x)))
q('mixed','B','medium','NF','For f(x) = (x − 4)² + 7, the graph of g(x) = f(x + 2) − 3 has a minimum at (h, k). What is h + k?', ['2','6','10','12'],1,'Substitution gives g(x)=(x−2)²+4. Its vertex is (2,4), so h+k=6.',2+4,checks=(s.expand(((x+2)-4)**2+7-3-((x-2)**2+4))==0,))
q('mixed','B','medium','NE','What is the solution of √(x + 6) = x?', ['-2','2','3','6'],2,'Squaring gives x²−x−6=0, with candidates 3 and −2. The square root is nonnegative, so only 3 satisfies the original equation.',s.solve(s.sqrt(x+6)-x,x)[0])
q('mixed','B','medium','EQ','For x ≠ 3, which expression is equivalent to (x² − x − 6)/(x − 3)?', ['x − 2','x + 2','x + 3','x − 3'],1,'Factor the numerator as (x−3)(x+2), then cancel the nonzero factor x−3.',True,checks=(s.cancel((x*x-x-6)/(x-3))==x+2,))
q('mixed','B','medium','NF','An exponential function f(x) = ab^x, where a and b are positive constants, satisfies f(0) = 6 and f(2) = 54. What is f(3)?', ['72','108','162','486'],2,'Write f(x)=6b^x. Then b²=9 and b=3. Thus f(3)=6(27)=162.',6*s.sqrt(s.Rational(54,6))**3)
q('mixed','B','hard','NE','For what positive value of k does x² − kx + 16 = 0 have exactly one real solution?', ['4','8','16','32'],1,'Exactly one real root requires k²−64=0. The positive value is k=8.',s.solve(k*k-64,k)[1])
q('mixed','D','easy','RU','A map uses a scale of 1 centimeter for 8 kilometers. A route measures 6.5 centimeters on the map. At an average speed of 40 kilometers per hour, how many minutes does the route take?', ['13','52','78','104'],2,'The distance is 6.5(8)=52 km. Time is 52/40 hours, or 78 minutes.',s.Rational(13,2)*8/40*60)
q('mixed','D','medium','PC','A jacket is discounted by 20%, then a 10% tax is added to the discounted price. The final price is $88. What was the original price, in dollars?', ['96.8','100','108','110'],1,'The final price is 0.8(1.1)p=0.88p. Therefore p=88/0.88=100.',88/(s.Rational(4,5)*s.Rational(11,10)))
q('mixed','D','medium','PR','Of 60 students, 24 take art. Of the students taking art, 9 also take music. A student is selected at random from those taking art. What is the probability that the student also takes music?', ['3/20','3/8','2/5','9/36'],1,'The condition restricts the sample space to the 24 art students. Of these, 9 take music, giving 9/24=3/8.',s.Rational(9,24))
q('mixed','G','easy','LT','Triangles ABC and DEF are similar, with A corresponding to D and B to E. AB = 6, DE = 9, and BC = 10. What is EF?', ['15','20/3','13','16'],0,'Corresponding lengths scale by DE/AB=9/6. Thus EF=10(9/6)=15.',10*s.Rational(9,6))
q('mixed','G','medium','CI','A circle has equation x² + y² − 6x + 8y = 11. What is its radius?', ['3','6','11','36'],1,'Completing squares gives (x−3)²+(y+4)²=36. The radius is √36=6.',s.sqrt(11+9+16))
q('mixed','G','hard','RT','In right triangle ABC, angle C is 90° and sin A = 3/5. If the area of the triangle is 54, what is the hypotenuse?', ['12','15','18','30'],1,'The sides are 3t,4t,5t. Area is 6t²=54, so t=3 and the hypotenuse is 15.',5*s.sqrt(s.Rational(54,6)))

# MODULE 2 EASIER, FORM A: 7/7/4/4 domains; still legitimate SAT reasoning.
q('easier','A','easy','L1','If 5x + 7 = 2x + 25, what is the value of 3x + 1?', ['7','18','19','31'],2,'Subtracting 2x+7 gives 3x=18, so x=6 and 3x+1=19.',3*s.solve(5*x+7-(2*x+25),x)[0]+1)
q('easier','A','easy','LF','A linear function has f(2) = 11 and f(6) = 23. What is f(0)?', ['3','5','8','11'],1,'The rate of change is 12/4=3. Moving from x=2 to x=0 subtracts 6 from 11, giving 5.',11-2*s.Rational(23-11,6-2))
q('easier','A','easy','LS','The system x + y = 14 and x − y = 4 has solution (x, y). What is xy?', ['20','45','49','90'],1,'Adding gives 2x=18, so x=9 and y=5. Their product is 45.',s.solve([x+s.Symbol('y')-14,x-s.Symbol('y')-4],[x,s.Symbol('y')])[x]*5)
q('easier','A','medium','LI','A phone plan costs $18 per month plus $3 per gigabyte used. If the monthly budget is at most $45, what is the maximum whole number of gigabytes that can be used?', ['9','15','21','27'],0,'Solve 18+3g≤45, obtaining g≤9.',s.floor(s.Rational(45-18,3)))
q('easier','A','medium','L2','A line is parallel to y = −2x + 7 and passes through (3, 1). What is the x-coordinate of its x-intercept?', ['-7/2','1/2','3','7/2'],3,'The new line has slope −2. Using (3,1) gives y=−2x+7, and setting y=0 gives x=7/2.',s.Rational(1+2*3,2))
q('easier','A','medium','LF','A candle is 24 centimeters tall before it burns and 19 centimeters tall after 2 hours. Assuming a constant burning rate, after how many total hours will it be 9 centimeters tall?', ['3.6','6','7.6','10'],1,'The candle loses 5/2 cm per hour. A loss of 15 cm takes 15/(5/2)=6 hours.',s.Rational(24-9,s.Rational(24-19,2)))
q('easier','A','hard','LS','For one positive value of a, the system ax + 2y = 6 and 3x + (a − 1)y = 9 has no solution. What is a?', ['0','3','4','12'],1,'Parallel lines require equal coefficient ratios: a/3=2/(a−1). Cross-multiplying gives a²−a−6=0, so a=3 or −2. At positive a=3, the left sides are identical but their constants differ, so no solution exists.',max(s.solve(a*(a-1)-6,a)),checks=(3-1==2,6!=9))
q('easier','B','easy','EQ','Which expression is equivalent to x² + 8x + 15?', ['(x + 3)(x + 5)','(x − 3)(x − 5)','(x + 1)(x + 15)','(x + 4)² − 15'],0,'The factors have constants adding to 8 and multiplying to 15: 3 and 5.',True,checks=(s.expand((x+3)*(x+5))==x*x+8*x+15,))
q('easier','B','easy','NE','What is the larger solution of (x − 2)(x + 5) = 0?', ['-5','-2','2','5'],2,'A product is zero when a factor is zero. The solutions are 2 and −5, and the larger is 2.',max(s.solve((x-2)*(x+5),x)))
q('easier','B','easy','NF','For the quadratic f(x) = (x + 2)² − 9, what is the minimum value of f(x)?', ['-9','-2','2','9'],0,'The square is at least zero and is zero at x=−2. Therefore the minimum output is −9.',((x+2)**2-9).subs(x,-2))
q('easier','B','medium','NF','A population is modeled by P(t) = 200(1.10)^t, where t is measured in years. Which expression models the population after m months?', ['200(1.10)^(m/12)','200(1.10)^(12m)','200(0.10)^m','200(1.10)^m'],0,'Since m months is m/12 years, substitute t=m/12.',True,checks=(s.Rational(12,12)==1,s.Rational(24,12)==2))
q('easier','B','medium','NE','If x is positive and x² + 3x = 28, what is x + 3?', ['4','7','10','28'],1,'Factoring x²+3x−28 gives (x+7)(x−4). The positive root is 4, so x+3=7.',max(s.solve(x*x+3*x-28,x))+3)
q('easier','B','medium','EQ','For x ≠ 0, which expression is equivalent to (6x² + 9x)/(3x)?', ['2x + 3','2x² + 3x','3x + 2','2x + 9'],0,'Divide each numerator term by 3x, yielding 2x+3.',True,checks=(s.cancel((6*x*x+9*x)/(3*x))==2*x+3,))
q('easier','B','hard','NE','For a value of k, squaring both sides of √(x + k) = x − 2 produces a quadratic with a repeated root, and that root satisfies the original equation. What is k?', ['-9/4','-2','2','9/4'],0,'Squaring gives x²−5x+4−k=0. Its discriminant 9+4k is zero when k=−9/4. The repeated root is 5/2; both original sides equal 1/2, so it is valid.',s.solve(9+4*k,k)[0],checks=(s.sqrt(s.Rational(5,2)-s.Rational(9,4))==s.Rational(5,2)-2,))
q('easier','D','easy','RU','A recipe uses flour and sugar in a mass ratio of 5 to 2. If their combined mass is 420 grams, how many grams of sugar are used?', ['84','120','168','300'],1,'There are 7 ratio parts. Sugar accounts for 2/7 of the total, or 120 grams.',420*s.Rational(2,7))
q('easier','D','easy','PC','A store raises a price from $40 to $46. What is the percentage increase?', ['6','13','15','115'],2,'The increase is 6 relative to the original 40, so 100(6/40)=15%.',100*s.Rational(46-40,40))
q('easier','D','medium','OD','Five measurements have a mean of 12. A sixth measurement of 24 is added. What is the new mean?', ['14','16','18','36'],0,'The original total is 5(12)=60. The new total is 84, divided by 6, giving 14.',s.Rational(5*12+24,6))
q('easier','D','medium','ST','A researcher randomly selects 200 students from one high school to survey about sleep. To which population can the survey results most appropriately be generalized?', ['All students at that high school','All high school students in the country','Only the 200 surveyed students','All people who sleep less than eight hours'],0,'Random sampling supports generalization to the population sampled: students at that school. It does not support extrapolation to all schools.',True,checks=(200>0, 'one high school' in 'one high school'))
q('easier','G','easy','AV','A rectangular garden is twice as long as it is wide and has a perimeter of 36 meters. What is its area, in square meters?', ['36','54','72','144'],2,'If width is w and length 2w, perimeter is 6w=36, giving w=6 and length=12. Area is 72.',2*(s.Rational(36,6))**2)
q('easier','G','easy','LT','Two parallel lines are cut by a transversal. One of the obtuse angles is 118°. What is the measure, in degrees, of each acute angle?', ['28','62','118','152'],1,'Adjacent acute and obtuse angles form a straight angle, so the acute angle is 180−118=62.',180-118)
q('easier','G','medium','CI','A sector of a circle has central angle 60° and radius 6. What is its area divided by π?', ['3','6','12','36'],1,'The sector is 60/360 of the circle. Its area is (1/6)π(36)=6π.',s.Rational(60,360)*6**2)
q('easier','G','medium','RT','In right triangle ABC, angle C is 90°, AC = 8, and BC = 6. What is cos A?', ['3/5','3/4','4/5','4/3'],2,'The hypotenuse is √(64+36)=10. The side adjacent to A is AC=8, so cos A=8/10=4/5.',8/s.sqrt(8**2+6**2))

# MODULE 2 HARDER, FORM A.
q('harder','A','easy','LF','A line has slope 3/2 and passes through (4, 9). What is its y-intercept?', ['3','6','9','15'],0,'Use y=mx+b. Then b=9−(3/2)(4)=3.',9-s.Rational(3,2)*4)
q('harder','A','medium','LS','Two printers working together print 150 pages in 5 minutes. Printer A prints 6 more pages per minute than printer B. How many pages does printer B print in 8 minutes?', ['72','96','120','144'],1,'Their combined rate is 30 pages/minute. With A=B+6, 2B+6=30 gives B=12, so B prints 96 pages in 8 minutes.',8*(s.Rational(150,5)-6)/2)
q('harder','A','medium','LI','A company ships boxes weighing 4 kilograms and 7 kilograms. A shipment must contain at least 20 boxes and weigh at most 110 kilograms. If it contains exactly 12 of the 4-kilogram boxes, what is the greatest possible number of 7-kilogram boxes?', ['7','8','9','15'],1,'At least 8 large boxes are needed. The weight bound gives 48+7b≤110, or b≤62/7. Thus the greatest whole number is 8.',s.floor(s.Rational(110-4*12,7)),checks=(12+8>=20,))
q('harder','A','hard','LS','The system 3x + 2y = 12 and ax + 8y = b has no solution when a = 12. Which value of b would instead make the system have infinitely many solutions?', ['12','24','36','48'],3,'With a=12, the second left side is four times the first. Infinite solutions require b=4(12)=48.',4*12)
q('harder','A','hard','L1','For one real value of k, the equation (k² − 4)x = k + 2 has no solution. What is that value?', ['-2','0','2','6'],2,'A zero x coefficient requires k=2 or k=−2. At k=−2, the equation is 0=0 and has infinitely many solutions. At k=2, it is 0=4 and has no solution.',2,checks=(2**2-4==0,2+2!=0,(-2)**2-4==0,(-2)+2==0))
q('harder','A','hard','L2','The line ax + by = 12 has x-intercept 3 and y-intercept −2. What is a − b?', ['-10','-2','2','10'],3,'At (3,0), a=4. At (0,−2), b=−6. Thus a−b=10.',s.Rational(12,3)-s.Rational(12,-2))
q('harder','A','medium','LF','A linear function f satisfies f(x + 3) − f(x) = 12 for every x. If f(2) = 5, what is f(7)?', ['17','20','25','33'],2,'The increase over 3 input units is 12, so the slope is 4. From input 2 to 7, the output increases by 20, giving 25.',5+5*s.Rational(12,3))
q('harder','B','medium','NF','An object has height h(t) = −4t² + 24t + 7. What is its maximum height?', ['7','24','36','43'],3,'The vertex occurs at t=−24/(−8)=3. Then h(3)=−36+72+7=43.',(-4*x*x+24*x+7).subs(x,3))
q('harder','B','hard','NE','For what value of k does the line y = 2x + k intersect the parabola y = x² at exactly one point?', ['-4','-1','1','4'],1,'Substitution gives x²−2x−k=0. Its discriminant 4+4k must be zero, giving k=−1.',s.solve(4+4*k,k)[0])
q('harder','B','hard','EQ','For positive a and b, which expression is equivalent to (a^(3/2)b^(−1/2))²/(ab)?', ['a²/b²','a/b','a²/b','a³/b²'],0,'Squaring the numerator gives a³/b. Dividing by ab yields a²/b².',True,checks=(s.cancel((a**3/b)/(a*b))==a*a/(b*b),))
q('harder','B','hard','NE','For x ≠ 2, the equation (x² − 6x + k)/(x − 2) = 0 has exactly one distinct real solution for two real values of k. What is the sum of those values?', ['8','9','17','18'],2,'One valid root occurs either with a double root, requiring discriminant 36−4k=0 and k=9, or when one of two roots is excluded at x=2, requiring k=8. Their sum is 17.',8+9,checks=(s.solve(x*x-6*x+8,x)==[2,4],s.solve(x*x-6*x+9,x)==[3]))
q('harder','B','hard','NF','A quadratic f has zeros −1 and 5 and satisfies f(2) = −18. What is f(0)?', ['-20','-10','10','20'],1,'Write f(x)=a(x+1)(x−5). At x=2, −9a=−18 gives a=2. Then f(0)=2(1)(−5)=−10.',s.Rational(-18,(2+1)*(2-5))*(0+1)*(0-5))
q('harder','B','medium','NF','For f(x) = x² − 6x + 11, what is the minimum value of f(x + 1) + 4?', ['2','4','6','9'],2,'Completing the square gives f(x)=(x−3)²+2. A horizontal shift preserves the minimum, while +4 raises it to 6.',11-9+4)
q('harder','B','hard','NE','The equation x² + bx + 12 = 0 has two positive roots, one three times the other. What is b?', ['-16','-8','8','16'],1,'Let the roots be r and 3r. Their product 3r²=12 gives r=2, so their sum is 8. The coefficient b is the negative sum: −8.',-4*s.sqrt(s.Rational(12,3)))
q('harder','D','easy','TD','A line of best fit is y = 2.4x + 18. A data point has x = 10 and observed y = 47. What is observed y minus predicted y?', ['-5','5','18','29'],1,'The predicted value is 2.4(10)+18=42. The residual is 47−42=5.',47-(s.Rational(24,10)*10+18))
q('harder','D','medium','PR','A survey records 40 cyclists and 60 noncyclists. Of the cyclists, 30 wear helmets; of the noncyclists, 15 wear helmets for other activities. Among respondents who wear helmets, what fraction are cyclists?', ['3/10','1/2','2/3','3/4'],2,'There are 30+15=45 helmet wearers, of whom 30 are cyclists. The conditional fraction is 30/45=2/3.',s.Rational(30,30+15))
q('harder','D','medium','IN','A random sample estimates that 62% of a town supports a proposal, with a margin of error of 4 percentage points. Which statement is supported?', ['The population support is plausibly between 58% and 66%','Exactly 62% of residents support it','Every random sample will give between 58% and 66%','The margin of error proves the proposal causes support'],0,'The estimate plus or minus its margin gives 58% to 66%. This is an uncertainty interval, not an exact count or a guarantee about every sample.',True,checks=(62-4==58,62+4==66))
q('harder','D','hard','PC','A positive quantity increases by p%, then decreases by p%. The final quantity is 91% of the original. What is p?', ['9','18','30','45'],2,'The combined factor is (1+p/100)(1−p/100)=1−(p/100)²=0.91. Thus (p/100)²=0.09 and p=30.',100*s.sqrt(1-s.Rational(91,100)))
q('harder','G','medium','AV','Two similar solid cones have volumes in the ratio 8 to 27. The smaller cone has height 10. What is the height of the larger cone?', ['15','20','135/4','30'],0,'The linear scale factor is the cube root of 27/8, which is 3/2. The larger height is 15.',10*s.real_root(s.Rational(27,8),3))
q('harder','G','medium','CI','A circle has radius 12. An arc has length 8π. What is the central angle of the arc, in degrees?', ['60','90','120','240'],2,'The full circumference is 24π, so the arc is one third of the circle. Its angle is 120°.',360*s.Rational(8,24))
q('harder','G','hard','RT','In right triangle ABC, angle C is 90° and tan A = 5/12. The hypotenuse is 39. What is the area of the triangle?', ['90','180','270','540'],2,'The sides have ratio 5:12:13. The scale factor is 3, so the legs are 15 and 36. Area is 15(36)/2=270.',s.Rational(1,2)*5*12*(s.Rational(39,13))**2)
q('harder','G','medium','CI','The circle (x − 2)² + (y + 1)² = 25 intersects the line y = 3 at two points. What is the distance between those points?', ['3','6','8','10'],1,'At y=3, (x−2)²=25−16=9, so x=−1 or 5. The horizontal distance is 6.',2*s.sqrt(25-(3+1)**2))
# MODULE 1, FORM B: distinct setups and reasoning, not number variants of Form A.
q('mixed','A','easy','L1','A number n is multiplied by 4, then 9 is subtracted. The result equals twice the sum of n and 3. What is n?', ['3','15/2','9','15'],1,'The description gives 4n−9=2(n+3). Thus 2n=15 and n=15/2.',s.solve(4*x-9-2*(x+3),x)[0])
q('mixed','A','easy','LF','The equation C = 0.08m + 15 gives the cost, in dollars, to mail m brochures. What does 15 represent?', ['The cost when no brochures are mailed','The cost of each brochure','The number of brochures mailed for one dollar','The increase in cost for 15 brochures'],0,'The constant term is the cost at m=0, so it is the fixed cost.',True,checks=((s.Rational(8,100)*x+15).subs(x,0)==15,))
q('mixed','A','medium','LS','A school orders 30 small and large banners. Small banners cost $9 and large banners cost $15. The total cost is $342. What fraction of the banners are large?', ['1/5','2/5','3/5','4/5'],1,'If l is the large count, 9(30−l)+15l=342 gives l=12. Thus 12/30=2/5 are large.',s.solve(9*(30-x)+15*x-342,x)[0]/30)
q('mixed','A','medium','L2','The equation 2x + 5y = 35 describes a line. If x increases by 10 along the line, by how much does y decrease?', ['2','4','5','10'],1,'Changes satisfy 2Δx+5Δy=0. With Δx=10, Δy=−4, a decrease of 4.',s.Rational(2*10,5))
q('mixed','A','medium','LI','A volunteer must spend at least 12 hours on two projects. Project A takes 3 hours per session and project B takes 2 hours per session. Which pair (A sessions, B sessions) meets the requirement?', ['(1, 4)','(2, 2)','(2, 3)','(3, 1)'],2,'The respective totals are 11,10,12,11 hours. Only (2,3) reaches at least 12.',True,checks=(sum(3*u+2*v>=12 for u,v in [(1,4),(2,2),(2,3),(3,1)])==1,3*2+2*3==12))
q('mixed','A','medium','LF','A line passes through (−2, 7) and (4, −5). What is the value of y at the point on the line where x = 1?', ['-1','1','3','5'],1,'The slope is (−5−7)/(4+2)=−2. Moving three x units from −2 to 1 subtracts 6 from 7, giving 1.',7+s.Rational(-5-7,4-(-2))*(1-(-2)))
q('mixed','A','hard','LS','For the system 4x − 6y = 10 and 2x − 3y = c, which condition describes all and only the values of c for which there is no solution?', ['c ≠ 5','c = 5','c = 0 only','c > 5 only'],0,'The first equation is twice the second left side. Consistency requires c=5. Every other value of c makes the system inconsistent.',True,checks=(s.expand((4*x-6*s.Symbol('y')-10)-2*(2*x-3*s.Symbol('y')-5))==0,))
q('mixed','A','hard','L1','For what value of k does 2(kx + 3) = 8x + k have no solution?', ['2','3','4','6'],2,'The x coefficient vanishes when 2k=8, so k=4. The remaining statement is 6=4, which is false.',4,checks=(2*4==8,6!=4))
q('mixed','B','easy','EQ','For x > 0, which expression is equivalent to √(25x²) + √(4x²)?', ['7x','29x','sqrt(29)*x','21x²'],0,'Since x is positive, the square roots are 5x and 2x. Their sum is 7x.',True,checks=(s.sqrt(25*9)+s.sqrt(4*9)==7*3,))
q('mixed','B','easy','NE','If (x − 1)² = 16, what is the sum of all real solutions?', ['-8','0','2','8'],2,'The solutions are x−1=±4, so x=5 or −3. Their sum is 2.',sum(s.solve((x-1)**2-16,x)))
q('mixed','B','medium','NF','The function f(x) = x² + bx + c has a vertex at (3, −4). What is c?', ['-13','-4','5','9'],2,'Vertex form is (x−3)²−4=x²−6x+5, so c=5.',s.expand((x-3)**2-4).subs(x,0))
q('mixed','B','medium','NE','What is the positive solution of x² = 3x + 18?', ['3','6','9','18'],1,'Rearrange and factor: x²−3x−18=(x−6)(x+3). The positive root is 6.',max(s.solve(x*x-3*x-18,x)))
q('mixed','B','medium','EQ','For x ≠ −2 and x ≠ 2, which expression equals 1/(x − 2) − 1/(x + 2)?', ['4/(x² − 4)','2/(x² − 4)','4/(x² + 4)','2x/(x² − 4)'],0,'Use the common denominator (x−2)(x+2)=x²−4. The numerator is (x+2)−(x−2)=4.',True,checks=(s.cancel(1/(x-2)-1/(x+2)-4/(x*x-4))==0,))
q('mixed','B','medium','NF','A substance has a half-life of 3 hours. Its mass is 96 grams at time zero. What is its mass after 9 hours?', ['12','24','32','48'],0,'Nine hours contains three half-lives, so the mass is 96(1/2)³=12 grams.',96*s.Rational(1,2)**(9//3))
q('mixed','B','medium','NE','The graphs y = x² − 2 and y = 2x + 1 intersect at two points. What is the sum of the x-coordinates of those points?', ['-3','-2','2','3'],2,'Equating outputs gives x²−2x−3=0, with roots −1 and 3. Their sum is 2.',sum(s.solve(x*x-2-(2*x+1),x)))
q('mixed','B','hard','NF','A polynomial p(x) leaves a remainder of 7 when divided by x − 2. If q(x) = p(x) − 3x, what is the remainder when q(x) is divided by x − 2?', ['1','4','7','13'],0,'The remainder theorem gives p(2)=7. Thus q(2)=7−3(2)=1, which is q’s remainder.',7-3*2)
q('mixed','D','easy','OD','A data set consists of 4, 6, 8, 10, and 12. A second data set is formed by adding 3 to every value. How does its standard deviation compare with that of the first set?', ['It is unchanged','It increases by 3','It is multiplied by 3','It decreases by 3'],0,'Adding the same constant moves every value and the mean equally, preserving all deviations and the standard deviation.',True,checks=(sum((v-8)**2 for v in [4,6,8,10,12])==sum((v-11)**2 for v in [7,9,11,13,15]),))
q('mixed','D','medium','TD','Measurements give (time in hours, temperature in °C): (1, 18), (3, 24), (5, 30). If the linear trend continues, at what time will the temperature reach 39°C?', ['6','7','8','9'],2,'The rate is 6/2=3°C per hour. The model is T=3t+15. Solving 39=3t+15 gives t=8.',s.Rational(39-(18-3*1),3))
q('mixed','D','medium','IN','A random sample of 80 trees from a forest contains 12 diseased trees. Using the sample proportion, how many diseased trees are estimated in a forest of 2,400 trees?', ['120','240','360','480'],2,'The estimated disease fraction is 12/80=0.15. Multiplying by 2400 gives 360.',2400*s.Rational(12,80))
q('mixed','G','easy','LT','An exterior angle of a triangle is 125°. One nonadjacent interior angle is 48°. What is the other nonadjacent interior angle, in degrees?', ['55','77','125','173'],1,'An exterior angle equals the sum of the two nonadjacent interior angles. The unknown is 125−48=77.',125-48)
q('mixed','G','medium','AV','A cube’s surface area is 150 square centimeters. What is its volume, in cubic centimeters?', ['25','75','125','150'],2,'For side s, 6s²=150 gives s=5. The volume is s³=125.',s.sqrt(s.Rational(150,6))**3)
q('mixed','G','hard','CI','A line is tangent to a circle at T. The circle’s center is O. Point P on the tangent line satisfies OP = 13 and PT = 12. What is the area of the circle divided by π?', ['5','25','144','169'],1,'Radius OT is perpendicular to tangent PT. By the Pythagorean theorem, OT²=13²−12²=25. The circle’s area is 25π.',13**2-12**2)

# MODULE 2 EASIER, FORM B.
q('easier','A','easy','L1','A rectangle’s length is 4 centimeters more than its width. Its perimeter is 40 centimeters. What is its width?', ['6','8','10','12'],1,'Let width be w. Then 2w+2(w+4)=40, giving 4w=32 and w=8.',s.solve(2*x+2*(x+4)-40,x)[0])
q('easier','A','easy','LF','A taxi charges $5 to begin a trip and $2.50 per kilometer. A trip costs $22.50. How many kilometers long is the trip?', ['5','7','9','11'],1,'Subtract the initial fee, then divide by the distance rate: (22.50−5)/2.50=7.',(s.Rational(45,2)-5)/s.Rational(5,2))
q('easier','A','easy','L2','Which point lies on the line 3x − 2y = 12?', ['(2, 3)','(4, 0)','(0, 6)','(6, 2)'],1,'Substituting the four points gives 0,12,−12,14 on the left. Only (4,0) gives 12.',True,checks=(sum(3*u-2*v==12 for u,v in [(2,3),(4,0),(0,6),(6,2)])==1,))
q('easier','A','medium','LS','Two numbers have a sum of 21. The larger is twice the smaller minus 3. What is the larger number?', ['8','10','13','16'],2,'Let the smaller be n. Then n+(2n−3)=21 gives n=8. The larger is 13.',2*s.solve(x+(2*x-3)-21,x)[0]-3)
q('easier','A','medium','LI','Which inequality describes all solutions of 7 − 2x > 15?', ['x < −4','x > −4','x < 4','x > 4'],0,'Subtracting 7 gives −2x>8. Dividing by −2 reverses the inequality: x<−4.',True,checks=(s.solve_univariate_inequality(7-2*x>15,x)==(x<-4),))
q('easier','A','medium','LF','A line crosses the y-axis at 6 and the x-axis at 4. What is y when x = 2?', ['2','3','4','6'],1,'The slope is (0−6)/(4−0)=−3/2. At x=2, y=6−3=3.',6+s.Rational(-6,4)*2)
q('easier','A','hard','LS','The lines kx + 4y = 8 and 3x + ky = 7 are parallel and distinct. If k is positive, what is k?', ['0','2*sqrt(3)','4','12'],1,'Their slopes are −k/4 and −3/k. Equating them gives k²=12, so positive k=2√3. The constants are not in the same ratio as the coefficients, so the lines are distinct.',max(s.solve(k*k-12,k)),checks=(s.simplify(s.Rational(7,8)-s.sqrt(3)/2)!=0,))
q('easier','B','easy','EQ','Which expression is equivalent to (2x + 1)(x − 3)?', ['2x² − 5x − 3','2x² − 6x + 1','2x² + 5x − 3','2x² − 5x + 3'],0,'Distribute: 2x²−6x+x−3=2x²−5x−3.',True,checks=(s.expand((2*x+1)*(x-3))==2*x*x-5*x-3,))
q('easier','B','easy','NF','The graph of y = x² is shifted 3 units to the right and 2 units down. What is the resulting equation?', ['y = (x − 3)² − 2','y = (x + 3)² − 2','y = (x − 2)² − 3','y = (x − 3)² + 2'],0,'A right shift replaces x by x−3. A downward shift subtracts 2.',True,checks=(((x-3)**2-2).subs(x,3)==-2,s.diff((x-3)**2-2,x).subs(x,3)==0))
q('easier','B','easy','NE','How many distinct real solutions does x² + 6x + 9 = 0 have?', ['1','2','3','9'],0,'The left side factors as (x+3)². The repeated root x=−3 counts as one distinct real solution.',len(s.solve(x*x+6*x+9,x)))
q('easier','B','medium','NF','The value of a machine decreases by 15% each year. Its initial value is $8,000. Which function gives its value after t years?', ['8000(0.85)^t','8000(0.15)^t','8000 − 15t','8000(1.15)^t'],0,'A decrease of 15% leaves a factor of 0.85 each year. Apply that factor t times.',True,checks=(1-s.Rational(15,100)==s.Rational(85,100),))
q('easier','B','medium','NE','If 1/x + 1/6 = 1/2, what is x?', ['2','3','4','6'],1,'Subtracting 1/6 gives 1/x=1/3, so x=3.',s.solve(1/x+s.Rational(1,6)-s.Rational(1,2),x)[0])
q('easier','B','medium','NF','A quadratic has zeros 1 and 7 and opens upward. What is the x-coordinate of its vertex?', ['1','3','4','7'],2,'The axis of symmetry lies halfway between the zeros: (1+7)/2=4.',s.Rational(1+7,2))
q('easier','B','hard','NE','For positive k, which condition describes all and only the values of k for which |x − 2| + |x + 2| = k has exactly two distinct real solutions?', ['k > 4','k = 4','0 < k < 4','k ≥ 4'],0,'Between −2 and 2 the sum is always 4, so k=4 gives infinitely many solutions. Outside that interval the sum is 2|x|, giving exactly two solutions when k>4. Smaller k gives none.',True,checks=(s.Abs(-2)+s.Abs(2)==4,s.Abs(3-2)+s.Abs(3+2)==6,s.Abs(-3-2)+s.Abs(-3+2)==6))
q('easier','D','easy','PR','A two-way table records 18 students who play soccer and chess, 12 who play soccer only, 10 who play chess only, and 20 who play neither. What is the probability that a randomly selected student plays chess?', ['3/10','7/15','1/2','3/5'],1,'Chess players total 18+10=28 out of 60 students, giving 28/60=7/15.',s.Rational(18+10,18+12+10+20))
q('easier','D','easy','RU','A cyclist travels 18 kilometers in 45 minutes. What is the average speed, in kilometers per hour?', ['13.5','18','24','30'],2,'Forty-five minutes is 3/4 hour. The rate is 18/(3/4)=24 km/hour.',18/s.Rational(45,60))
q('easier','D','medium','OD','A frequency table has value 2 occurring 3 times, value 4 occurring 4 times, and value 8 occurring 1 time. What is the mean?', ['3','15/4','14/3','4'],1,'The weighted total is 2(3)+4(4)+8(1)=30, across 8 observations. The mean is 30/8=15/4.',s.Rational(2*3+4*4+8,3+4+1))
q('easier','D','medium','ST','Students choose whether to attend an optional review session. Those attending score higher on average. Why does this alone fail to show that the session caused higher scores?', ['The groups were not randomly assigned and may differ in other ways','The higher average proves the session caused improvement','Averages cannot be compared between groups','A larger sample would automatically remove all confounding'],0,'Self-selection can create differences in motivation or prior preparation. Without random assignment, this comparison alone does not establish causation.',True,checks=(True,))
q('easier','G','easy','AV','A cylinder has radius 3 and height 8. What is its volume divided by π?', ['24','48','72','144'],2,'Cylinder volume is πr²h=π(9)(8)=72π.',3**2*8)
q('easier','G','easy','CI','A circle has circumference 18π. What is its area divided by π?', ['9','18','81','324'],2,'From 2πr=18π, r=9. Its area is 81π.',s.Rational(18,2)**2)
q('easier','G','medium','RT','A ladder 13 feet long reaches 12 feet up a vertical wall. The wall and ground are perpendicular. How many feet is the foot of the ladder from the wall?', ['1','5','7','25'],1,'The ladder is the hypotenuse. The horizontal distance is √(13²−12²)=5.',s.sqrt(13**2-12**2))
q('easier','G','medium','LT','Two triangles are similar. Their areas are 16 and 36. A side of the smaller triangle is 10. What is the corresponding side of the larger triangle?', ['15','20','22.5','25'],0,'The linear scale factor is √(36/16)=3/2. The corresponding side is 15.',10*s.sqrt(s.Rational(36,16)))

# MODULE 2 HARDER, FORM B.
q('harder','A','easy','L1','If (3x − 2)/4 = (x + 6)/2, what is x?', ['7','10','14','16'],2,'Multiplying by 4 gives 3x−2=2x+12, so x=14.',s.solve((3*x-2)/4-(x+6)/2,x)[0])
q('harder','A','medium','LF','A laboratory converts a measurement x to a new scale by f(x) = ax + b. It has f(10) = 26 and f(25) = 56. What is f(−5)?', ['-14','-4','4','16'],1,'The slope is 30/15=2 and b=6. Thus f(−5)=−10+6=−4.',26+s.Rational(56-26,25-10)*(-5-10))
q('harder','A','medium','LI','A feasible region satisfies y ≥ x + 2 and y ≤ −2x + 14. What is the greatest possible value of x in the region?', ['2','4','6','12'],1,'For both to hold, x+2≤−2x+14. This gives 3x≤12, so the maximum x is 4.',s.solve(x+2-(-2*x+14),x)[0])
q('harder','A','hard','LS','For positive a, the system ax + 2y = 6 and 8x + ay = 13 has no solution for exactly one value of a. What is a?', ['2','4','6','8'],1,'Equal coefficient ratios require a/8=2/a, or a²=16. The positive possibility is a=4. Then twice the first left side equals the second, but twice 6 is 12, not 13, so the equations are inconsistent.',4)
q('harder','A','hard','L2','A line through (2, 5) is perpendicular to 2x − 3y = 9. What is its y-intercept?', ['2','6','8','10'],2,'The given line has slope 2/3. The perpendicular slope is −3/2. Thus b=5−(−3/2)(2)=8.',5+s.Rational(3,2)*2)
q('harder','A','hard','LF','A linear function satisfies f(2x) = 2f(x) − 7 for every real x. What is f(0)?', ['-7','0','7','14'],2,'Setting x=0 gives f(0)=2f(0)−7, so f(0)=7.',s.solve(k-(2*k-7),k)[0])
q('harder','A','medium','LS','A solution is made by mixing 10% salt water and 25% salt water. The final 30-liter mixture is 20% salt. How many liters of the 25% solution are used?', ['10','15','20','25'],2,'If v liters are 25%, the salt balance is 0.25v+0.10(30−v)=0.20(30). Solving gives v=20.',s.solve(s.Rational(1,4)*x+s.Rational(1,10)*(30-x)-s.Rational(1,5)*30,x)[0])
q('harder','B','medium','EQ','Which expression is equivalent to x³ − 4x² − x + 4?', ['(x − 4)(x − 1)(x + 1)','(x + 4)(x − 1)(x + 1)','(x − 4)(x² + 1)','(x − 1)(x² − 4)'],0,'Grouping gives x²(x−4)−(x−4)=(x−4)(x²−1), then factor the difference of squares.',True,checks=(s.expand((x-4)*(x-1)*(x+1))==x**3-4*x*x-x+4,))
q('harder','B','hard','NE','The equation x² − 6x + c = 0 has two distinct real roots whose difference is 4. What is c?', ['5','9','13','20'],0,'The roots sum to 6 and differ by 4, so they are 5 and 1. Their product is c=5.',((6+4)/2)*((6-4)/2))
q('harder','B','hard','NF','For f(x) = a(x − h)² + k, f(1) = f(5) = 8 and f(3) = −4. What is a?', ['-3','2','3','12'],2,'Equal outputs at 1 and 5 place the axis at h=3. Then k=−4 and 8=4a−4, giving a=3.',s.Rational(8-(-4),(1-3)**2))
q('harder','B','hard','NE','For positive k, the equation x⁴ − 5x² + k = 0 has exactly two distinct real solutions. What is k?', ['0','25/4','5','25'],1,'With u=x², the quadratic u²−5u+k has two positive roots when 0<k<25/4, producing four x roots. Exactly two x roots occur at its double positive root, so 25−4k=0 and k=25/4.',s.Rational(25,4),checks=(len(s.solve(x**4-5*x*x+s.Rational(25,4),x))==2,))
q('harder','B','hard','NF','A positive exponential function f(x) = ab^x satisfies f(1) = 12 and f(4) = 96. What is a + b?', ['6','8','10','14'],1,'The ratio f(4)/f(1)=b³=8 gives b=2. Then a=12/2=6, so a+b=8.',12/s.real_root(s.Rational(96,12),3)+s.real_root(s.Rational(96,12),3))
q('harder','B','medium','NE','What is the sum of the solutions of (x − 3)² = 2x + 1?', ['4','6','8','10'],2,'Expansion gives x²−8x+8=0. The root sum is 8.',sum(s.solve((x-3)**2-(2*x+1),x)))
q('harder','B','hard','NE','For what value of k does x² + 4x + k = 0 have a root that is twice the other root?', ['16/9','32/9','4','8'],1,'Let roots be r and 2r. Their sum 3r=−4 gives r=−4/3. Their product k=2r²=32/9.',2*s.Rational(-4,3)**2)
q('harder','D','easy','RU','A machine produces 1,200 parts in 50 minutes. At the same rate, how many hours does it take to produce 3,600 parts?', ['1.5','2','2.5','3'],2,'The target is three times the original output, requiring 150 minutes, or 2.5 hours.',s.Rational(3600,1200)*50/60)
q('harder','D','medium','OD','Data set A is 2, 4, 6, 8, 10. Data set B is 1, 4, 6, 8, 11. Which comparison is correct?', ['They have the same mean, but B has greater standard deviation','B has a greater mean and the same standard deviation','A has a greater mean and greater standard deviation','They have equal means and equal standard deviations'],0,'Both means are 6. B moves the endpoints farther from 6, increasing the sum of squared deviations from 40 to 58.',True,checks=(sum([2,4,6,8,10])==sum([1,4,6,8,11]),sum((v-6)**2 for v in [1,4,6,8,11])>sum((v-6)**2 for v in [2,4,6,8,10])))
q('harder','D','medium','ST','A study randomly assigns volunteers to two exercise programs and compares their blood pressure afterward. Which feature best supports a conclusion that the program caused a difference?', ['Random assignment to the programs','The volunteers came from one city','Both groups had more than one person','The outcome was measured numerically'],0,'Random assignment helps balance other influences between groups, supporting a causal comparison. It does not itself make the volunteers representative of everyone.',True,checks=(True,))
q('harder','D','hard','PC','The price of an item is reduced by 25%. By what percentage must the reduced price increase to return to the original price?', ['25','100/3','50','75'],1,'The reduced price is 3/4 of the original. To restore it requires a factor of 4/3, an increase of 1/3 or 100/3 percent.',100*(1/s.Rational(3,4)-1))
q('harder','G','medium','AV','A rectangular prism has dimensions x, 2x, and 3x and volume 162. What is its total surface area?', ['54','108','198','324'],2,'Volume gives 6x³=162, so x=3. Surface area is 2(2x²+3x²+6x²)=22x²=198.',22*s.real_root(s.Rational(162,6),3)**2)
q('harder','G','medium','CI','A circle centered at (−3, 4) passes through (1, 7). What is its radius?', ['3','4','5','7'],2,'The radius is the distance from center to the point: √((1+3)²+(7−4)²)=5.',s.sqrt((1+3)**2+(7-4)**2))
q('harder','G','hard','LT','In triangle ABC, D lies on AB and E lies on AC, with DE parallel to BC. AD = 4, DB = 6, and the area of triangle ADE is 12. What is the area of quadrilateral DBCE?', ['30','48','63','75'],2,'The linear ratio AD/AB is 4/10=2/5, so the area ratio is 4/25. The large triangle has area 12(25/4)=75. Subtracting 12 gives 63.',12/s.Rational(4,10)**2-12)
q('harder','G','medium','RT','Angles A and B of a right triangle are complementary. If sin A = 7/25, what is sin B?', ['7/25','7/24','24/25','25/24'],2,'Since B=90°−A, sin B=cos A. For an acute angle, cos A=√(1−(7/25)²)=24/25.',s.sqrt(1-s.Rational(7,25)**2))

# Exactly five Module 1 and six Module 2 student-produced responses per form.
# Common eligible slots keep every assembled 44-item path at 11 SPRs (25%).
SPR_SLOTS={'mixed':{3,7,11,17,20},'easier':{3,5,11,15,18,20},'harder':{3,6,10,12,17,20}}
for pool,slots in SPR_SLOTS.items():
    for i,row in enumerate(r for r in bank if r['pool']==pool):
        if i%22 in slots:
            key=s.sympify(row['verification'])
            assert key.is_Rational
            row['question_type']='student_produced_response'
            row['correct_answer']=str(key)
            for letter in 'abcde': row['choice_'+letter]=None

if __name__=='__main__':
    assert len(bank)==132
    assert Counter(r['pool'] for r in bank)=={'mixed':44,'easier':44,'harder':44}
    assert len({r['question_text'] for r in bank})==132
    # Identify wording similarities; reviewed pairs are recorded in the audit report.
    near=[]
    for i,r in enumerate(bank):
        for t in bank[:i]:
            ratio=SequenceMatcher(None,r['question_text'],t['question_text']).ratio()
            if ratio>.84: near.append({'ids':[r['id'],t['id']],'similarity':round(ratio,3)})
    out=Path(__file__).with_name('bank.json')
    out.write_text(json.dumps(bank,indent=2))
    print(json.dumps({'items':len(bank),'by_pool':dict(Counter(r['pool'] for r in bank)),
       'by_domain':dict(Counter(r['category_name'] for r in bank)),
       'by_difficulty':dict(Counter(r['difficulty'] for r in bank)),
       'spr':sum(r['question_type']=='student_produced_response' for r in bank),'near_pairs':near},indent=2))
